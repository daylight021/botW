const sharp = require('sharp');

module.exports = {
  name: "hd",
  alias: ["upscale", "remini"],
  description: "Meningkatkan resolusi dan mempertajam gambar.",
  category: "converter",
  execute: async (msg, { bot, args, usedPrefix, command }) => {
    try {
      const quotedMessage = msg.quoted ? msg.quoted : msg;
      
      // Memeriksa apakah serializer berhasil mengidentifikasi media sebagai gambar.
      if (!quotedMessage.isMedia || quotedMessage.type !== 'imageMessage') {
        return msg.reply(`Kirim atau balas gambar dengan caption \`${usedPrefix + command}\`.\n\n*Opsi Tambahan:*\nGunakan flag \`-s\` untuk mengatur skala.\nContoh: \`${usedPrefix + command} -s 3\` (untuk upscale 3x).`);
      }
      // --- AKHIR PERBAIKAN ---

      let scale = 2; // Skala default adalah 2x
      const scaleIndex = args.findIndex(arg => arg.toLowerCase() === '-s');

      if (scaleIndex !== -1 && args[scaleIndex + 1]) {
        let customScale = parseInt(args[scaleIndex + 1], 10);
        
        if (isNaN(customScale) || customScale < 2) {
            msg.reply("⚠️ Skala tidak valid. Menggunakan skala default (2x).");
            scale = 2;
        } else if (customScale > 4) {
            msg.reply("⚠️ Untuk menjaga performa, skala maksimal adalah 4x.");
            scale = 4;
        } else {
            scale = customScale;
        }
      }

      await msg.react("⏳");

      // Menggunakan objek 'quotedMessage' yang sudah benar untuk diunduh
      const imageBuffer = await bot.downloadMediaMessage(quotedMessage);
      const metadata = await sharp(imageBuffer).metadata();
      
      const newWidth = metadata.width * scale;
      const newHeight = metadata.height * scale;

      const processedImage = await sharp(imageBuffer)
        .resize(newWidth, newHeight, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain'
        })
        .sharpen({
          sigma: 1,
          m1: 1,
          m2: 2,
          x1: 2,
          y2: 10,
          y3: 20
        })
        .toBuffer();

      await bot.sendMessage(msg.from, { 
          image: processedImage,
          caption: `✅ Gambar berhasil di-upscale ${scale}x dan dipertajam!` 
      }, { quoted: msg });

      await msg.react("✅");

    } catch (error) {
      console.error("Error pada perintah HD:", error);
      await msg.react("❌");
      msg.reply("Terjadi kesalahan saat memproses gambar.");
    }
  },
};