const Jimp = require('jimp');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: "hd",
  alias: ["upscale", "enhance"],
  description: "Meningkatkan resolusi dan kualitas gambar.",
  category: "converter",
  execute: async (msg, { bot, usedPrefix, command }) => {
    try {
      const quotedMessage = msg.quoted ? msg.quoted : msg;
      const messageType = quotedMessage.type || "";
      
      if (messageType !== 'imageMessage') {
        return msg.reply(`Kirim atau balas gambar dengan caption \`${usedPrefix + command}\` untuk meningkatkan kualitasnya.`);
      }

      await msg.react("⏳");

      const imageBuffer = await downloadMediaMessage(
        quotedMessage,
        'buffer',
        {}
      );
      
      // Membaca gambar menggunakan Jimp
      const image = await Jimp.read(imageBuffer);

      // Melakukan upscale 2x dengan algoritma kualitas tinggi
      image.scale(2, Jimp.RESIZE_HERMITE);

      // Sedikit meningkatkan kontras untuk efek mempertajam
      image.contrast(0.1);

      // Mengubah gambar kembali menjadi buffer
      const processedImage = await image.getBufferAsync(Jimp.MIME_JPEG);

      // Mengirim gambar hasil
      await bot.sendMessage(msg.from, { 
          image: processedImage,
          caption: `✅ Gambar berhasil di-upscale dan kualitasnya ditingkatkan!`,
          jpegThumbnail: processedImage.toString('base64'),
          mimetype: 'image/jpeg'
      }, { quoted: msg });

      await msg.react("✅");

    } catch (error) {
      console.error("Error pada perintah HD (Jimp):", error);
      await msg.react("❌");
      msg.reply("Terjadi kesalahan saat memproses gambar.");
    }
  },
};