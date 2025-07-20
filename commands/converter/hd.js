const axios = require('axios');
const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// --- Menggunakan API eksternal dari Vyro.ai ---
async function remini(imageBuffer, method = 'enhance') {
    return new Promise(async (resolve, reject) => {
        try {
            const form = new FormData();
            form.append('image', imageBuffer, { filename: 'enhance_image.jpg', contentType: 'image/jpeg' });
            form.append('model_version', 1);

            const { data } = await axios.post(
                `https://inferenceengine.vyro.ai/${method}`,
                form, {
                    headers: {
                        ...form.getHeaders(),
                        'accept': 'image/jpeg',
                        'user-agent': 'Remini/1.0.0', // Meniru header aplikasi
                    },
                    responseType: 'arraybuffer',
                }
            );
            resolve(data);
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = {
  name: "hd",
  alias: ["remini", "enhance", "upscale"],
  description: "Meningkatkan resolusi dan detail gambar menggunakan AI.",
  category: "converter",
  execute: async (msg, { bot, usedPrefix, command }) => {
    try {
      const quotedMessage = msg.quoted ? msg.quoted : msg;
      const mime = quotedMessage.mimetype || "";
      
      if (!/image/.test(mime)) {
        return msg.reply(`Kirim atau balas gambar dengan caption \`${usedPrefix + command}\` untuk meningkatkan kualitasnya menggunakan AI. Proses ini sangat cepat!`);
      }

      await msg.react("🧠"); // Reaksi "berpikir"

      const imageBuffer = await downloadMediaMessage(
        quotedMessage,
        'buffer',
        {}
      );
      
      // Memanggil fungsi remini dengan metode 'enhance'
      const processedImage = await remini(imageBuffer, 'enhance');

      // Kirim gambar yang sudah diproses
      await bot.sendMessage(msg.from, { 
          image: processedImage,
          caption: `✅ Gambar berhasil ditingkatkan dengan AI!`,
          jpegThumbnail: processedImage.toString('base64'),
          mimetype: 'image/jpeg'
      }, { quoted: msg });

      await msg.react("✅");

    } catch (error) {
      console.error("Error pada perintah HD (API):", error);
      await msg.react("❌");
      msg.reply("Terjadi kesalahan saat menghubungi server AI. Coba lagi beberapa saat.");
    }
  },
};