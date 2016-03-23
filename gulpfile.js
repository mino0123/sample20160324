const fs = require('fs');
const gulp = require('gulp');
const zip = require('gulp-zip');
const file = require('gulp-file');
const deploy = require('gulp-jsforce-deploy');
const through = require('through2');
const metadata = require('salesforce-metadata-xml-builder');
const product = require('cartesian-product');
const meta = require('jsforce-metadata-tools');

const FIELD_LIST = require('./fields.js')();

const API_VERSION = '36.0';
const CLASS_NAME = 'TestToSOQL';
const OBJECT_NAME = 'TestObject__c';
const SF_USERNAME = process.env.SF_USERNAME;
const SF_PASSWORD = process.env.SF_PASSWORD;

const FIELDS = FIELD_LIST.map((f) => f.fullName);
const OPERATORS = [
  {name: 'eq'  , exp: '='},
  {name: 'lt'  , exp: '<'},
  {name: 'gt'  , exp: '>'},
  {name: 'le'  , exp: '<='},
  {name: 'ge'  , exp: '>='},
  {name: 'like', exp: 'LIKE'},
  {name: 'inc' , exp: 'INCLUDES'},
  {name: 'exc' , exp: 'EXCLUDES'}
];
const VALUES = [
  {name: 'number'  , exp: '1' },
  {name: 'string'  , exp: '\'1\'' },
  {name: 'null'    , exp: 'null' },
  {name: 'list'    , exp: 'new String[]{\'1\'}' },
  {name: 'bool'    , exp: 'true' },
  {name: 'date'    , exp: 'Date.today()' },
  {name: 'datetime', exp: 'DateTime.now()' }
];

function makeQueryTestClass(name) {
  const methods = product([
    FIELDS, OPERATORS, VALUES
  ]).map((args) => {
    const field = args[0];
    const op = args[1];
    const val = args[2];
    return `
    @isTest
    static void test_${field.replace('__c', '')}_${op.name}_${val.name}() {
      Object v = ${val.exp};
      SObject[] records = Database.query('SELECT Id FROM ${OBJECT_NAME} WHERE ${field} ${op.exp} :v ');
    }`;
  });
  return `
@isTest
class ${name} {
  ${methods.join('\n')}
}
`;
}

function makeObject() {
  const label = OBJECT_NAME.replace('__c', '');
  return {
    label: label,
    pluralLabel: label,
    fields: FIELD_LIST,
    nameField: {
      type: 'AutoNumber',
      label: '番号'
    },
    deploymentStatus: 'Deployed',
    sharingModel: 'ReadWrite'
  }
}

function makeProfile() {
  return {
    name: 'Admin',
    objectPermissions: [{
      allowRead: true,
      allowCreate: true,
      allowEdit: true,
      allowDelete: true,
      object: OBJECT_NAME
    }],
    fieldPermissions: FIELDS.map((f) => {
      return {field: `${OBJECT_NAME}.${f}`, readable: true, editable: true}
    })
  };
}

gulp.task('deploy', () => {

  const classbody = makeQueryTestClass(CLASS_NAME);
  const classmeta = metadata.ApexClass({ apiVersion: API_VERSION, status: 'Active' });
  const objectxml = metadata.CustomObject(makeObject());
  const profilexml = metadata.Profile(makeProfile());
  const packagexml = metadata.Package({ version: API_VERSION, types: [
    { name: 'ApexClass', members: ['*'] },
    { name: 'CustomObject', members: ['*'] }
  ]});

  through.obj()
    .pipe(file(`src/classes/${CLASS_NAME}.cls`, classbody, {src: true}))
    .pipe(file(`src/classes/${CLASS_NAME}.cls-meta.xml`, classmeta))
    .pipe(file(`src/objects/${OBJECT_NAME}.object`, objectxml))
    .pipe(file(`src/profiles/Admin.profile`, profilexml))
    .pipe(file('src/package.xml', packagexml))
    // .pipe(gulp.dest('./tmp'))
    .pipe(zip('pkg.zip'))
    .pipe(deploy({
      username: SF_USERNAME,
      password: SF_PASSWORD,
      rollbackOnError: true
    }));

});

gulp.task('test', () => {
  const packagexml = metadata.Package({ version: API_VERSION, types: []});
  const testdeploy = through.obj((file, enc, callback) => {
    meta.deployFromZipStream(file.contents, {
      username: SF_USERNAME,
      password: SF_PASSWORD,
      testLevel: 'RunSpecifiedTests',
      runTests: [CLASS_NAME],
      pollTimeout: 180e3,
      pollInterval: 10e3
    })
      .then(function(res) {
        const testResult = res.details.runTestResult;
        function splitMethodName(methodName) {
          return methodName.split('_').slice(1);
        }
        function makeTSVLine(r, resultText) {
          const method = splitMethodName(r.methodName);
          const arr = [method[0], method[1], method[2]];
          if (r.message) { arr.push(r.message); }
          return arr.join('\t');
        }
        const successLines = testResult.successes.map((r) => makeTSVLine(r, 'success'));
        const failureLines = testResult.failures .map((r) => makeTSVLine(r, 'fail'));
        const lines = successLines.concat(failureLines);
        fs.writeFileSync('testResult.tsv', lines.join('\n'), 'utf8');
        if (!res.success) {
          return callback(new Error('Deploy Failed.'));
        }
        callback(null, file);
      })
      .catch(function(err) {
        callback(err);
      });
  });
  return through.obj()
    .pipe(file('src/package.xml', packagexml, {src: true}))
    .pipe(zip('pkg.zip'))
    .pipe(testdeploy);
});
