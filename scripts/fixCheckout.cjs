const fs = require('fs');
const path = require('path');

const checkoutPath = path.join(__dirname, '../../frontend/src/pages/Checkout.tsx');
let content = fs.readFileSync(checkoutPath, 'utf8');

// 1. Update the Calculate Fee fallback. Let's make sure it doesn't just blindly set 30000 if district is missing.
const oldCalcLogic = `      if (districtId && wardCode) {
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
      }`;

const newCalcLogic = `      if (districtId && wardCode && !isNaN(districtId)) {
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
      }`;

content = content.replace(oldCalcLogic, newCalcLogic);

// 2. Replace guest city input with dropdowns
const oldGuestCityInput = `<input 
                    type="text" 
                    name="city"
                    value={shippingInfo.city}
                    onChange={handleInputChange}
                    placeholder="Tỉnh / Thành phố" 
                    className="w-full px-4 py-3 border border-gray-200 rounded-md focus:border-primary outline-none transition-colors"
                  />`;

const newGuestCityInput = `<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select required value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-md focus:border-primary outline-none transition-colors appearance-none">
                      <option value="">Tỉnh / Thành</option>
                      {provinces.map((p) => (
                        <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>
                      ))}
                    </select>
                    <select required value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} disabled={!selectedProvince} className="w-full px-4 py-3 border border-gray-200 rounded-md focus:border-primary outline-none transition-colors appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed">
                      <option value="">Quận / Huyện</option>
                      {districts.map((d) => (
                        <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
                      ))}
                    </select>
                    <select required value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)} disabled={!selectedDistrict} className="w-full px-4 py-3 border border-gray-200 rounded-md focus:border-primary outline-none transition-colors appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed">
                      <option value="">Phường / Xã</option>
                      {wards.map((w) => (
                        <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
                      ))}
                    </select>
                  </div>`;

content = content.replace(oldGuestCityInput, newGuestCityInput);

// 3. In handlePlaceOrder, if NOT logged in, we must use selectedProvince/District/Ward instead of shippingInfo.city
// and if Logged In, we must check if the saved address has valid district!
const oldHandlePlaceOrderStart = `if (!isDifferentAddress) {
      if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address || !shippingInfo.city) {
        toast.error("Vui lòng điền đầy đủ thông tin giao hàng!");
        return;
      }
      if (shippingInfo.phone.length !== 10) {
        toast.error("Số điện thoại phải có đúng 10 chữ số!");
        return;
      }
    } else {`;

const newHandlePlaceOrderStart = `if (!isLoggedIn) {
      if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address || !selectedProvince || !selectedDistrict || !selectedWard) {
        toast.error("Vui lòng điền đầy đủ thông tin giao hàng!");
        return;
      }
      if (shippingInfo.phone.length !== 10) {
        toast.error("Số điện thoại phải có đúng 10 chữ số!");
        return;
      }
    } else if (!isDifferentAddress) {
      if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address || !shippingInfo.city) {
        toast.error("Vui lòng điền đầy đủ thông tin giao hàng!");
        return;
      }
      const addr = addresses.find(a => (a._id || a.id) === selectedAddressId);
      if (!addr || !addr.district || isNaN(parseInt(addr.district))) {
        toast.error("Địa chỉ giao hàng này dùng định dạng cũ. Vui lòng nhấn 'Thay Đổi' để cập nhật lại địa chỉ với Quận/Huyện!");
        return;
      }
      if (shippingInfo.phone.length !== 10) {
        toast.error("Số điện thoại phải có đúng 10 chữ số!");
        return;
      }
    } else {`;

content = content.replace(oldHandlePlaceOrderStart, newHandlePlaceOrderStart);

// 4. Update the logic that sets districtId/wardCode for calculateFee for guest users
// In calculateFee, if (!isLoggedIn), we should use selectedDistrict/selectedWard!
const oldCalcSetup = `      if (isDifferentAddress) {
        districtId = parseInt(selectedDistrict);
        wardCode = selectedWard;
      } else {
        const addr = addresses.find(a => (a._id || a.id) === selectedAddressId);`;

const newCalcSetup = `      if (isDifferentAddress || !isLoggedIn) {
        districtId = parseInt(selectedDistrict);
        wardCode = selectedWard;
      } else {
        const addr = addresses.find(a => (a._id || a.id) === selectedAddressId);`;

content = content.replace(oldCalcSetup, newCalcSetup);

// 5. Update finalShippingAddress in handlePlaceOrder to use the selected dropdowns for guest
const oldFinalShippingAddress = `      const finalShippingAddress = isDifferentAddress ? {
        name: altShippingInfo.name,
        phone: altShippingInfo.phone,
        address: altShippingInfo.address,
        city: \`\${wards.find(w => String(w.WardCode) === String(selectedWard))?.WardName || ''}, \${districts.find(d => String(d.DistrictID) === String(selectedDistrict))?.DistrictName || ''}, \${provinces.find(p => String(p.ProvinceID) === String(selectedProvince))?.ProvinceName || ''}\`.replace(/^, | , /g, '').trim(),
        postalCode: "000000",
        country: "Vietnam"
      } : {
        name: shippingInfo.name,
        phone: shippingInfo.phone,
        address: shippingInfo.address,
        city: shippingInfo.city,
        postalCode: "000000",
        country: "Vietnam"
      };`;

const newFinalShippingAddress = `      const finalShippingAddress = (!isLoggedIn || isDifferentAddress) ? {
        name: !isLoggedIn ? shippingInfo.name : altShippingInfo.name,
        phone: !isLoggedIn ? shippingInfo.phone : altShippingInfo.phone,
        address: !isLoggedIn ? shippingInfo.address : altShippingInfo.address,
        city: \`\${wards.find(w => String(w.WardCode) === String(selectedWard))?.WardName || ''}, \${districts.find(d => String(d.DistrictID) === String(selectedDistrict))?.DistrictName || ''}, \${provinces.find(p => String(p.ProvinceID) === String(selectedProvince))?.ProvinceName || ''}\`.replace(/^, | , /g, '').trim(),
        postalCode: "000000",
        country: "Vietnam"
      } : {
        name: shippingInfo.name,
        phone: shippingInfo.phone,
        address: shippingInfo.address,
        city: shippingInfo.city,
        postalCode: "000000",
        country: "Vietnam"
      };`;

content = content.replace(oldFinalShippingAddress, newFinalShippingAddress);

// 6. Make sure useEffect fetchProvinces triggers for guest
const oldUseEffectProv = `  useEffect(() => {
    if ((isDifferentAddress || addressModalView === "form") && provinces.length === 0) {
      fetchProvinces()`;

const newUseEffectProv = `  useEffect(() => {
    if ((!isLoggedIn || isDifferentAddress || addressModalView === "form") && provinces.length === 0) {
      fetchProvinces()`;

content = content.replace(oldUseEffectProv, newUseEffectProv);

fs.writeFileSync(checkoutPath, content);
console.log("Fix complete");
