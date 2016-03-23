module.exports = function () {
  const types = [
    // 'Lookup',
    'Checkbox',
    'Currency',
    'Date',
    'DateTime',
    'Email',
    'Number',
    'Percent',
    'Phone',
    'Picklist',
    'MultiselectPicklist',
    'Text',
    'TextArea',
    'LongTextArea',
    'Url',
    'Html'
  ];
  const TYPES_NUMERIC = [
    'Currency', 'Number', 'Percent'
  ];
  const TYPES_REQUIRE_VISIBLE_LINES = [
    'MultiselectPicklist', 'Html', 'LongTextArea'
  ];
  var fields = types.map(function (type) {
    var field = {};
    field.type = type;
    field.label = type;
    field.fullName = type + '01__c';
    if (type === 'Text') {
      field.length = 255;
    }
    if (TYPES_NUMERIC.indexOf(type) >= 0) {
      field.precision = 18;
      field.scale = 0;
    }
    if (TYPES_REQUIRE_VISIBLE_LINES.indexOf(type) >= 0) {
      field.visibleLines = 10;
    }
    if (type === 'Checkbox') {
      field.defaultValue = 'false';
    }
    if (type === 'LongTextArea' || type === 'Html') {
      field.length = 32000;
    }
    // if (type === 'Lookup') {
    //   field.referenceTo = 'TestObject__c';
    //   field.relationshipName = 'Children';
    // }
    if (type === 'MultiselectPicklist' || type === 'Picklist') {
      field.picklist = {
        picklistValues: [
          { fullName: '1'},
          { fullName: '2'},
          { fullName: '3'},
          { fullName: '4'},
          { fullName: '5'}
        ]
      };
    }
    return field;
  });
  return fields;
};
