const fs = require('fs');
const path = require('path');
const data = require('../node_modules/china-area-data/data.json');

// 省份列表
const provinces = data['86'];

const provinceCityOptions = Object.keys(provinces).map(provinceCode => {
  const provinceName = provinces[provinceCode];
  const cities = data[provinceCode] || {};
  const cityCodes = Object.keys(cities);

  // 判断是否为直辖市（只有一个市辖区）
  if (cityCodes.length === 1 && cities[cityCodes[0]] === '市辖区') {
    // 取区级
    const districts = data[cityCodes[0]] || {};
    return {
      value: provinceName,
      label: provinceName,
      children: Object.keys(districts).map(districtCode => ({
        value: districts[districtCode],
        label: districts[districtCode]
      }))
    };
  } else {
    // 普通省份，children 为市
    return {
      value: provinceName,
      label: provinceName,
      children: cityCodes.map(cityCode => ({
        value: cities[cityCode],
        label: cities[cityCode]
      }))
    };
  }
});

const outDir = path.join(__dirname, '../data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
fs.writeFileSync(
  path.join(outDir, 'province-city.json'),
  JSON.stringify(provinceCityOptions, null, 2),
  'utf-8'
);

console.log('已生成 data/province-city.json'); 