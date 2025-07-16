const Upscaler = require('upscaler/node');
const tf = require('@tensorflow/tfjs-node');

// Inisialisasi model upscaler
const upscaler = new Upscaler({
  model: 'esrgan-thick/2x', 
});

module.exports = {
  name: "hd",
  alias: ["upscale", "remini", "enhance"],
  description: "Meningkatkan resolusi dan detail gambar menggunakan AI.",
  category: "converter",
  execute: async (msg, { bot, usedPrefix, command }) => {
    try {
      const quotedMessage = msg.quoted ? msg.quoted : msg;
      const mime = quotedMessage.mimetype || "";
      
      if (!/image/.test(mime)) {
        return msg.reply(`Kirim atau balas gambar dengan caption \`${usedPrefix + command}\` untuk meningkatkan kualitasnya menggunakan AI. Proses ini mungkin memakan waktu lebih lama.`);
      }

      await msg.react("🧠");

      const imageBuffer = await bot.downloadMediaMessage(quotedMessage);
      const imageTensor = tf.node.decodeImage(imageBuffer, 3);
      const upscaledTensor = await upscaler.upscale(imageTensor, {
        output: 'tensor',
      });
      const processedImage = await tf.node.encodePng(upscaledTensor);

      tf.dispose([imageTensor, upscaledTensor]);

      // --- PERBAIKAN: Mengirim Gambar dengan Opsi Kualitas Tinggi ---
      await bot.sendMessage(msg.from, { 
          image: processedImage,
          caption: `✅ Gambar berhasil ditingkatkan dengan AI (2x)!`,
          // Menambahkan flag untuk mengirim dalam kualitas HD
          jpegThumbnail: processedImage.toString('base64'), // Diperlukan untuk beberapa versi
          mimetype: 'image/png', // Pastikan mimetype benar
          // Opsi di bawah ini mungkin diperlukan tergantung versi Baileys,
          // tapi biasanya 'mimetype' dan 'jpegThumbnail' sudah cukup.
          // highQuality: true 
      }, { quoted: msg });
      // --- AKHIR PERBAIKAN ---

      await msg.react("✅");
    } catch (error) {
      console.error("Error pada perintah HD (UpscalerJS):", error);
      await msg.react("❌");
      msg.reply("Terjadi kesalahan saat memproses gambar dengan AI. Mungkin gambar terlalu besar atau memori tidak cukup.");
    }
  },
};