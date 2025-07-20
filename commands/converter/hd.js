const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Fungsi sleep untuk menunggu proses AI selesai
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi untuk memanggil API Replicate dengan model yang benar
async function enhanceWithReplicate(imageBuffer) {
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN tidak ditemukan di file .env");
    }

    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Memulai proses upscale di Replicate
    const startResponse = await axios.post(
        "https://api.replicate.com/v1/predictions",
        {
            version: "9283608cc6b7be6b65a8e44983a5012c5b079261a838705eff34c76063428C47",
            input: { image: dataUrl, scale: 2 },
        },
        { headers: { Authorization: `Token ${REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } }
    );

    const endpointUrl = startResponse.data.urls.get;

    // Menunggu proses AI selesai
    let restoredImage = null;
    while (!restoredImage) {
        console.log("Menunggu hasil dari Replicate...");
        const finalResponse = await axios.get(endpointUrl, {
            headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
        });

        if (finalResponse.data.status === "succeeded") {
            restoredImage = finalResponse.data.output;
            break;
        } else if (finalResponse.data.status === "failed") {
            throw new Error("Proses upscale di Replicate gagal.");
        }
        await sleep(1000);
    }
    
    // Mengunduh gambar hasil
    const resultResponse = await axios.get(restoredImage, { responseType: 'arraybuffer' });
    return Buffer.from(resultResponse.data);
}


module.exports = {
  name: "hd",
  alias: ["remini", "enhance", "upscale"],
  description: "Meningkatkan resolusi dan detail gambar menggunakan AI.",
  category: "converter",
  execute: async (msg, { bot, usedPrefix, command }) => {
    try {
      const quotedMessage = msg.quoted ? msg.quoted : msg;
      const messageType = quotedMessage.type || "";
      
      if (messageType !== 'imageMessage') {
        return msg.reply(`Kirim atau balas gambar dengan caption \`${usedPrefix + command}\` untuk meningkatkan kualitasnya menggunakan AI.`);
      }

      await msg.react("🧠");

      const imageBuffer = await downloadMediaMessage(
        quotedMessage, 'buffer', {}
      );
      
      const processedImage = await enhanceWithReplicate(imageBuffer);

      await bot.sendMessage(msg.from, { 
          image: processedImage,
          caption: `✅ Gambar berhasil ditingkatkan dengan AI Real-ESRGAN!`,
          jpegThumbnail: processedImage.toString('base64'),
          mimetype: 'image/jpeg'
      }, { quoted: msg });

      await msg.react("✅");

    } catch (error) {
      console.error("Error pada perintah HD (Replicate):", error);
      await msg.react("❌");
      msg.reply(`Terjadi kesalahan saat memproses gambar dengan AI.\n\n_Detail: ${error.message}_`);
    }
  },
};