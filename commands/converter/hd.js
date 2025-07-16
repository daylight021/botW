const tf = require('@tensorflow/tfjs-node-cpu');
const Upscaler = require('upscaler/node');

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

      await bot.sendMessage(msg.from, { 
          image: processedImage,
          caption: `✅ Gambar berhasil ditingkatkan dengan AI (2x)!`,
          jpegThumbnail: processedImage.toString('base64'),
          mimetype: 'image/png',
      }, { quoted: msg });

      await msg.react("✅");

    } catch (error) {
      console.error("Error pada perintah HD (UpscalerJS):", error);
      await msg.react("❌");
      msg.reply("Terjadi kesalahan saat memproses gambar dengan AI. Mungkin gambar terlalu besar atau memori tidak cukup.");
    }
  },
};