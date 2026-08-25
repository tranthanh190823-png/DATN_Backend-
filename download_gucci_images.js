import mongoose from 'mongoose';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// Fix Node.js DNS resolution issues with MongoDB Atlas SRV
dns.setServers(['8.8.8.8', '1.1.1.1']);

// ===== CẤU HÌNH =====
const MONGO_URI = 'mongodb+srv://tranthanh190823_db_user:4XdQRtWqAWIG15YI@cluster0.rj4mhhv.mongodb.net/datn_nuochoa?retryWrites=true&w=majority&appName=Cluster0';
const OUTPUT_DIR = 'C:\\Gucci_Images';

// ===== KẾT NỐI DB =====
async function main() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Kết nối MongoDB Atlas thành công!');

        // Lấy tất cả sản phẩm GUCCI
        const Product = mongoose.connection.collection('products');
        const gucciProducts = await Product.find({ brand: 'GUCCI' }).toArray();

        console.log(`🔍 Tìm thấy ${gucciProducts.length} sản phẩm GUCCI\n`);

        if (gucciProducts.length === 0) {
            console.log('❌ Không tìm thấy sản phẩm GUCCI nào.');
            await mongoose.disconnect();
            return;
        }

        // Tạo thư mục gốc
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Duyệt từng sản phẩm
        for (const product of gucciProducts) {
            const productName = product.name;
            // Làm sạch tên folder (loại bỏ ký tự đặc biệt không hợp lệ cho tên folder Windows)
            const safeFolderName = productName.replace(/[<>:"/\\|?*]/g, '_').trim();
            const productFolder = path.join(OUTPUT_DIR, safeFolderName);

            // Tạo folder cho sản phẩm
            if (!fs.existsSync(productFolder)) {
                fs.mkdirSync(productFolder, { recursive: true });
            }

            console.log(`📦 Sản phẩm: ${productName}`);
            console.log(`   📁 Folder: ${productFolder}`);

            if (!product.images || product.images.length === 0) {
                console.log('   ⚠️  Không có ảnh\n');
                continue;
            }

            console.log(`   🖼️  Số ảnh: ${product.images.length}`);

            // Tải từng ảnh
            for (let i = 0; i < product.images.length; i++) {
                const imageUrl = product.images[i];
                // Lấy extension từ URL hoặc mặc định .jpg
                let ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
                // Loại bỏ query params nếu có trong extension
                if (ext.includes('?')) ext = ext.split('?')[0];
                
                const fileName = `${safeFolderName}_${i + 1}${ext}`;
                const filePath = path.join(productFolder, fileName);

                try {
                    await downloadFile(imageUrl, filePath);
                    console.log(`   ✅ Đã tải: ${fileName}`);
                } catch (err) {
                    console.log(`   ❌ Lỗi tải ${fileName}: ${err.message}`);
                }
            }
            console.log('');
        }

        console.log('🎉 Hoàn tất tải tất cả ảnh GUCCI!');
        console.log(`📂 Thư mục lưu: ${OUTPUT_DIR}`);
        await mongoose.disconnect();
        console.log('🔌 Đã ngắt kết nối MongoDB');

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// ===== HÀM TẢI ẢNH =====
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const request = protocol.get(url, (response) => {
            // Xử lý redirect (301, 302, 307, 308)
            if ([301, 302, 307, 308].includes(response.statusCode)) {
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
                    return;
                }
            }

            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(destPath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });

            fileStream.on('error', (err) => {
                fs.unlink(destPath, () => {}); // Xóa file lỗi
                reject(err);
            });
        });

        request.on('error', (err) => {
            reject(err);
        });

        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Timeout'));
        });
    });
}

main();
