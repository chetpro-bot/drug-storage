const drugs = ['Amoxicillin', 'Ibuprofen', 'Acetaminophen', 'Cetirizine', 'Azithromycin'];

async function testRx() {
  for (const d of drugs) {
    // 1차: generic_name AND _exists_:pediatric_use
    let url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(d)}"+AND+_exists_:pediatric_use&limit=1`;
    let res = await fetch(url);
    let json = await res.json();
    let item = json.results?.[0];
    if (!item) {
      // 2차: 일반 검색
      url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(d)}"&limit=1`;
      res = await fetch(url);
      json = await res.json();
      item = json.results?.[0];
    }
    const hasPediatric = !!item?.pediatric_use;
    const hasDosage = !!item?.dosage_and_administration;
    const setId = item?.openfda?.spl_set_id?.[0];
    const brand = item?.openfda?.brand_name?.[0] || item?.openfda?.generic_name?.[0];
    console.log(`${d}: HTTP ${res.status} | brand: ${brand} | pediatric: ${hasPediatric} | dosage: ${hasDosage} | setId: ${setId}`);
  }
}
testRx();
