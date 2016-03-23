// Boolean項目の検索でBindingと通常のSOQLに違いがあるか調査
//=> Binding方式でもfalseとして動作

TestObject__c[] records = new TestObject__c[]{
	new TestObject__c(
		Checkbox01__c = true
	),
	new TestObject__c(
		Checkbox01__c = false
	)
};

insert records;

Object value = null;
TestObject__c[] results = Database.query('SELECT Checkbox01__c FROM TestObject__c WHERE Checkbox01__c = :value');

for (TestObject__c r : results) {
	System.debug(r.Checkbox01__c);
}

delete records;
