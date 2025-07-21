const axios = require('axios');
const FormData = require('form-data');
// Impor fungsi download media yang benar dari Baileys
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Fungsi untuk memanggil API eksternal dari Vyro.ai
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
                        'user-agent': 'Remini/1.0.0',
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
      
      const messageType = quotedMessage.type || "";
      
      if (messageType !== 'imageMessage') {
        return msg.reply(`Kirim atau balas gambar dengan caption \`${usedPrefix + command}\` untuk meningkatkan kualitasnya menggunakan AI.`);
      }

      await msg.react("🧠"); // Reaksi "berpikir"

      // Menggunakan fungsi downloadMediaMessage yang sudah diimpor
      const imageBuffer = await downloadMediaMessage(
        quotedMessage,
        'buffer',
        {}
      );
      
      const processedImage = await remini(imageBuffer, 'enhance');

      // Mengirim gambar hasil dengan opsi kualitas HD
      await bot.sendMessage(msg.from, { 
          image: processedImage,
          caption: `✅ Gambar berhasil ditingkatkan dengan AI!`,
          jpegThumbnail: processedImage.toString('base64'), // Diperlukan untuk mode HD
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