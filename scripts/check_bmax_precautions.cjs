const https = require('https');

const url = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq07?serviceKey=cE1bN93a9mY0t01dM1oFq3P9R7lK6jH8eW2zX5vB4nM7kL9jH3fG5dD1sA8qW4eR&item_seq=202300072&type=json';

// Also test extractAgeContraindication directly on various strings
import('../src/utils/precautionsHelper.js').catch(() => {});
