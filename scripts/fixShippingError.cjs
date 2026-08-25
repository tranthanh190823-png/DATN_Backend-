const fs = require('fs');
const path = require('path');

const checkoutPath = path.join(__dirname, '../../frontend/src/pages/Checkout.tsx');
let content = fs.readFileSync(checkoutPath, 'utf8');

// 1. Add shippingError state
const statePattern = `const [baseShippingFee, setBaseShippingFee] = useState(0);`;
const newStatePattern = `const [baseShippingFee, setBaseShippingFee] = useState(0);
  const [shippingError, setShippingError] = useState(false);`;
content = content.replace(statePattern, newStatePattern);

// 2. Update calculateFee logic
const oldCalcLogic = `      if (districtId && wardCode && !isNaN(districtId)) {
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
          setShippingError(false);
          const res = await calculateShippingFee({
            to_district_id: districtId,
            to_ward_code: wardCode,
            insurance_value: subtotal
          });
          if (res.fee !== undefined) {
             setBaseShippingFee(res.fee);
          } else {
             setShippingError(true);
             setBaseShippingFee(0); 
          }
        } catch (error) {
           console.error("Error calculating fee", error);
           setShippingError(true);
           setBaseShippingFee(0); 
        }
      } else {
         setShippingError(false);
         setBaseShippingFee(0);
      }`;
content = content.replace(oldCalcLogic, newCalcLogic);

// 3. Update handlePlaceOrder
const oldHandlePlaceOrder = `if (!isLoggedIn) {
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
    } else {
      if (!altShippingInfo.name || !altShippingInfo.phone || !altShippingInfo.address || !selectedProvince || !selectedDistrict || !selectedWard) {
        toast.error("Vui lòng điền đầy đủ thông tin giao hàng!");
        return;
      }
      if (altShippingInfo.phone.length !== 10) {
        toast.error("Số điện thoại phải có đúng 10 chữ số!");
        return;
      }
    }`;

const newHandlePlaceOrder = `if (shippingError) {
      toast.error("Địa chỉ giao hàng không hợp lệ hoặc đã cũ. Vui lòng cập nhật lại địa chỉ mới!");
      return;
    }
    if (!isLoggedIn) {
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
      if (shippingInfo.phone.length !== 10) {
        toast.error("Số điện thoại phải có đúng 10 chữ số!");
        return;
      }
    } else {
      if (!altShippingInfo.name || !altShippingInfo.phone || !altShippingInfo.address || !selectedProvince || !selectedDistrict || !selectedWard) {
        toast.error("Vui lòng điền đầy đủ thông tin giao hàng!");
        return;
      }
      if (altShippingInfo.phone.length !== 10) {
        toast.error("Số điện thoại phải có đúng 10 chữ số!");
        return;
      }
    }`;
content = content.replace(oldHandlePlaceOrder, newHandlePlaceOrder);

// 4. Add warning message to UI (Logged in view)
const oldLoggedView = `{originalDefaultAddress?.isDefault && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-primary text-primary rounded-sm shrink-0 w-fit">Mặc định</span>}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    Chưa có địa chỉ nào được lưu. `;

const newLoggedView = `{originalDefaultAddress?.isDefault && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-primary text-primary rounded-sm shrink-0 w-fit">Mặc định</span>}
                  </div>
                  {shippingError && (
                    <div className="mt-3 text-sm text-red-500 font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                      Địa chỉ này không hỗ trợ tính phí ship GHN. Vui lòng "Thay Đổi" để tạo địa chỉ mới!
                    </div>
                  )}
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    Chưa có địa chỉ nào được lưu. `;
content = content.replace(oldLoggedView, newLoggedView);

fs.writeFileSync(checkoutPath, content);
console.log("Fix complete");
