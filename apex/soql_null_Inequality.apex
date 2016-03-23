// binding だと null値で不等号条件が使用できる件での実際に適用される条件を調査
//=> 条件が真として処理される。 (Number01__c >= :value OR Id = null)で全て表示
//   NOT付けても真になる NOT(Number01__c >= :value)
//   真: NOT(Number01__c >= :value OR Id = null)

TestObject__c[] records = new TestObject__c[]{
	new TestObject__c(
		Number01__c = 0
	),
	new TestObject__c(
		Number01__c = 1
	),
	new TestObject__c(
		Number01__c = -1
	)
};

insert records;

Object value = null;
TestObject__c[] results = Database.query('SELECT Number01__c FROM TestObject__c WHERE Id = null OR (NOT(Id = null OR Number01__c >= :value)) ');

System.debug(results.size());
for (TestObject__c r : results) {
	System.debug(r.Number01__c);
}

delete records;
