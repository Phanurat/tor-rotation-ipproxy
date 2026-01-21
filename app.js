const express = require('express');
const net = require('net'); // ใช้ net module แทนการ exec nc
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

const app = express();
const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050');

// ฟังก์ชันสั่งเปลี่ยน IP ผ่าน Socket โดยตรง
const rotateIP = () => {
    return new Promise((resolve, reject) => {
        const client = net.createConnection({ port: 9051, host: '127.0.0.1' }, () => {
            client.write('AUTHENTICATE ""\n');
            client.write('signal NEWNYM\n');
            client.write('QUIT\n');
        });

        client.on('data', (data) => {
            if (data.toString().includes('250')) { // 250 คือรหัส OK จาก Tor
                console.log('🔄 Tor: Identity changed, waiting for new circuit...');
                // เพิ่มเวลาเป็น 5 วินาทีเพื่อให้มั่นใจว่า Circuit ใหม่พร้อมใช้งานจริง
                setTimeout(resolve, 5000);
            }
        });

        client.on('error', (err) => {
            console.error('❌ Tor Control Error:', err.message);
            reject(err);
        });
    });
};

app.get('/send-package', async (req, res) => {
    const { target_url } = req.query;
    console.log(`\n--- New Request for: ${target_url} ---`);

    try {
        await rotateIP(); 
        // เพิ่ม timestamp ในการเรียก เพื่อป้องกัน axios cache ผลลัพธ์เดิม
        const response = await axios.get(target_url, { 
            httpAgent: agent, 
            httpsAgent: agent,
            params: { _t: Date.now() } 
        });
        
        console.log('✅ Success! IP:', response.data.IP || response.data);
        res.send({ status: 'Success', current_ip_data: response.data });
    } catch (error) {
        console.error('❌ Request Error:', error.message);
        res.status(500).send(error.message);
    }
});

app.listen(8000, () => console.log('🚀 API Server running on port 8000'));
