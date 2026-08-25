const fs = require('fs');
const path = require('path');

const checkoutPath = path.join(__dirname, '../../frontend/src/pages/Checkout.tsx');
let content = fs.readFileSync(checkoutPath, 'utf8');

// 1. Add imports
if (!content.includes('getProvinces as fetchProvinces')) {
    content = content.replace(
        'import { syncCartToServer } from "../utils/cartSync";',
        'import { syncCartToServer } from "../utils/cartSync";\nimport { getProvinces as fetchProvinces, getDistricts as fetchDistricts, getWards as fetchWards, calculateShippingFee } from "../services/shippingService";'
    );
}

// 2. Fetch Provinces logic
content = content.replace(
    /fetch\("https:\/\/provinces\.open-api\.vn\/api\/p\/"\)\s*\.then\(\(res\) => res\.json\(\)\)\s*\.then\(\(data\) => setProvinces\(data \|\| \[\]\)\)\s*\.catch\(\(err\) => console\.error\(err\)\);/g,
    `fetchProvinces()\n        .then((data) => setProvinces(data || []))\n        .catch((err) => console.error(err));`
);

// 3. Fetch Districts/Wards logic
const oldFetchDistricts = `useEffect(() => {
    if (selectedProvince) {
      fetch(\`https://provinces.open-api.vn/api/p/\${selectedProvince}?depth=3\`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.districts) {
            const allWardsFlat = data.districts.flatMap((d: any) => 
              d.wards.map((w: any) => ({
                code: String(w.code),
                name: \`\${w.name}, \${d.name}\`,
                districtCode: String(d.code),
                districtName: d.name
              }))
            );
            setWards(allWardsFlat);
            setSelectedWard("");
          }
        })
        .catch((err) => console.error(err));
    } else {
      setWards([]);
    }
  }, [selectedProvince]);`;

const newFetchDistricts = `useEffect(() => {
    if (selectedProvince) {
      fetchDistricts(selectedProvince)
        .then((data) => {
          setDistricts(data || []);
          setSelectedDistrict("");
          setWards([]);
          setSelectedWard("");
        })
        .catch((err) => console.error(err));
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedDistrict) {
      fetchWards(selectedDistrict)
        .then((data) => {
          setWards(data || []);
          setSelectedWard("");
        })
        .catch((err) => console.error(err));
    } else {
      setWards([]);
    }
  }, [selectedDistrict]);`;

content = content.replace(oldFetchDistricts, newFetchDistricts);

// 4. Update address selection logic in handleOpenEditAddress
content = content.replace(
    /setSelectedProvince\(addr\.province\);\s*setTimeout\(\(\) => setSelectedWard\(addr\.ward\), 500\);/g,
    `setSelectedProvince(addr.province);\n    setTimeout(() => { setSelectedDistrict(addr.district); setTimeout(() => setSelectedWard(addr.ward), 500); }, 500);`
);

// 5. Update handleSaveAddress validation & mapping
content = content.replace(
    /if \(!selectedProvince \|\| !selectedWard \|\| !addressText\) {/g,
    `if (!selectedProvince || !selectedDistrict || !selectedWard || !addressText) {`
);

content = content.replace(
    /const prov = provinces\.find\(p => String\(p\.code\) === String\(selectedProvince\)\);\s*const w = wards\.find\(w => String\(w\.code\) === String\(selectedWard\)\);/g,
    `const prov = provinces.find(p => String(p.ProvinceID) === String(selectedProvince));\n    const dist = districts.find(d => String(d.DistrictID) === String(selectedDistrict));\n    const w = wards.find(w => String(w.WardCode) === String(selectedWard));`
);

content = content.replace(
    /province: String\(prov\?\.code\),\s*provinceName: prov\?\.name,\s*district: w\?\.districtCode,\s*districtName: w\?\.districtName,\s*ward: String\(w\?\.code\),\s*wardName: w\?\.name,/g,
    `province: String(prov?.ProvinceID),\n      provinceName: prov?.ProvinceName,\n      district: String(dist?.DistrictID),\n      districtName: dist?.DistrictName,\n      ward: String(w?.WardCode),\n      wardName: w?.WardName,`
);

// 6. Update Base Shipping Fee Logic
const oldShippingFeeLogic = `const currentCity = isDifferentAddress 
    ? (provinces.find(p => String(p.code) === String(selectedProvince))?.name || "")
    : shippingInfo.city;
  const isHCM = currentCity.toLowerCase().includes("hồ chí minh") || currentCity.toLowerCase().includes("ho chi minh") || currentCity.toLowerCase().includes("hcm");
  const baseShippingFee = (currentCity.trim() === "" || isHCM) ? 0 : 50000;`;

const newShippingFeeLogic = `const [baseShippingFee, setBaseShippingFee] = useState(0);

  useEffect(() => {
    const calculateFee = async () => {
      let districtId = 0;
      let wardCode = "";

      if (isDifferentAddress) {
        districtId = parseInt(selectedDistrict);
        wardCode = selectedWard;
      } else {
        const addr = addresses.find(a => (a._id || a.id) === selectedAddressId);
        if (addr && addr.district && addr.ward) {
          districtId = parseInt(addr.district);
          wardCode = String(addr.ward);
        }
      }

      if (districtId && wardCode) {
        try {
          const res = await calculateShippingFee({
            to_district_id: districtId,
            to_ward_code: wardCode,
            insurance_value: subtotal
          });
          if (res.fee !== undefined) {
             setBaseShippingFee(res.fee);
          } else {
             setBaseShippingFee(30000); 
          }
        } catch (error) {
           console.error("Error calculating fee", error);
           setBaseShippingFee(30000); 
        }
      } else {
         setBaseShippingFee(0);
      }
    };
    calculateFee();
  }, [isDifferentAddress, selectedDistrict, selectedWard, selectedAddressId, subtotal, addresses]);`;

content = content.replace(oldShippingFeeLogic, newShippingFeeLogic);

// 7. handlePlaceOrder validation
content = content.replace(
    /if \(!altShippingInfo\.name \|\| !altShippingInfo\.phone \|\| !altShippingInfo\.address \|\| !selectedProvince \|\| !selectedWard\) {/g,
    `if (!altShippingInfo.name || !altShippingInfo.phone || !altShippingInfo.address || !selectedProvince || !selectedDistrict || !selectedWard) {`
);

// 8. handlePlaceOrder finalShippingAddress
content = content.replace(
    /city: \`\$\{wards\.find\(w => String\(w\.code\) === String\(selectedWard\)\)\?\.name \|\| ''\}, \$\{provinces\.find\(p => String\(p\.code\) === String\(selectedProvince\)\)\?\.name \|\| ''\}\`\.replace\(\/\^\, \| \, \/g, ''\)\.trim\(\),/g,
    `city: \`\${wards.find(w => String(w.WardCode) === String(selectedWard))?.WardName || ''}, \${districts.find(d => String(d.DistrictID) === String(selectedDistrict))?.DistrictName || ''}, \${provinces.find(p => String(p.ProvinceID) === String(selectedProvince))?.ProvinceName || ''}\`.replace(/^, | , /g, '').trim(),`
);

// 9. handlePlaceOrder createAddress
content = content.replace(
    /const provinceObj = provinces\.find\(p => String\(p\.code\) === String\(selectedProvince\)\);\s*const wardObj = wards\.find\(w => String\(w\.code\) === String\(selectedWard\)\);/g,
    `const provinceObj = provinces.find(p => String(p.ProvinceID) === String(selectedProvince));\n            const distObj = districts.find(d => String(d.DistrictID) === String(selectedDistrict));\n            const wardObj = wards.find(w => String(w.WardCode) === String(selectedWard));`
);

content = content.replace(
    /province: String\(provinceObj\?\.code\),\s*provinceName: provinceObj\?\.name \|\| '',\s*district: String\(wardObj\?\.districtCode\),\s*districtName: wardObj\?\.districtName \|\| '',\s*ward: String\(wardObj\?\.code\),\s*wardName: wardObj\?\.name \|\| '',/g,
    `province: String(provinceObj?.ProvinceID),\n              provinceName: provinceObj?.ProvinceName || '',\n              district: String(distObj?.DistrictID),\n              districtName: distObj?.DistrictName || '',\n              ward: String(wardObj?.WardCode),\n              wardName: wardObj?.WardName || '',`
);

// 10. JSX Address modal updates
content = content.replace(
    /\{provinces\.map\(\(p\) => \(\s*<option key=\{p\.code\} value=\{p\.code\}>\{p\.name\}<\/option>\s*\)\)\}/g,
    `{provinces.map((p) => (\n                            <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>\n                          ))}`
);

const oldWardSelect = `<div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-700">Phường / Xã</label>
                        <select required value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)} disabled={!selectedProvince} className="w-full h-11 px-4 border border-gray-200 rounded bg-white focus:border-primary outline-none appearance-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed">
                          <option value="">Chọn Phường/Xã</option>
                          {wards.map((w) => (
                            <option key={w.code} value={w.code}>{w.name}</option>
                          ))}
                        </select>
                      </div>`;

const newWardSelect = `<div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-700">Quận / Huyện</label>
                        <select required value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} disabled={!selectedProvince} className="w-full h-11 px-4 border border-gray-200 rounded bg-white focus:border-primary outline-none appearance-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed">
                          <option value="">Chọn Quận/Huyện</option>
                          {districts.map((d) => (
                            <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-700">Phường / Xã</label>
                        <select required value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)} disabled={!selectedDistrict} className="w-full h-11 px-4 border border-gray-200 rounded bg-white focus:border-primary outline-none appearance-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed">
                          <option value="">Chọn Phường/Xã</option>
                          {wards.map((w) => (
                            <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
                          ))}
                        </select>
                      </div>`;

content = content.replace(oldWardSelect, newWardSelect);

fs.writeFileSync(checkoutPath, content);
console.log('Update complete');
