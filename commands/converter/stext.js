const { createCanvas } = require('canvas');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

/**
 * Fungsi cerdas untuk memformat teks menjadi beberapa baris.
 * @param {string} text Teks input.
 * @returns {string[]} Array berisi baris-baris teks yang sudah diformat.
 */
function formatText(text) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = [];

    if (words.length > 0 && words.length <= 3) {
        return words; // Setiap kata jadi satu baris jika total kata sedikit
    }

    for (let i = 0; i < words.length; i++) {
        currentLine.push(words[i]);
        const wordsPerLine = (words.length - i > 3) ? 3 : 2;
        if (currentLine.length >= wordsPerLine || i === words.length - 1) {
            lines.push(currentLine.join(' '));
            currentLine = [];
        }
    }
    return lines;
}

module.exports = {
    name: "stext",
    alias: ["stickertext", "stikerteks"],
    description: "Membuat stiker dari teks dengan format khusus.",
    category: "converter",
    execute: async (msg, { bot, args, usedPrefix, command }) => {
        const text = args.join(' ');

        if (!text) {
            return msg.reply(`Kirim perintah dengan format:\n*${usedPrefix + command} <teks kamu>*\n\nContoh:\n${usedPrefix + command} hidup memang tidak selalu indah`);
        }

        try {
            await msg.react("🎨");

            const lines = formatText(text);

            // --- Pengaturan Kanvas dan Teks ---
            const fontSize = 80;
            const fontFamily = 'Helvetica-Bold, sans-serif';
            const padding = 30;

            const tempCanvas = createCanvas(1, 1);
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.font = `${fontSize}px ${fontFamily}`;

            // Cari baris terpanjang untuk menentukan lebar basis
            let maxWidth = 0;
            lines.forEach(line => {
                const metrics = tempCtx.measureText(line);
                if (metrics.width > maxWidth) {
                    maxWidth = metrics.width;
                }
            });

            // Hitung lebar dan tinggi yang dibutuhkan oleh teks
            const requiredWidth = maxWidth + (padding * 2);
            const requiredHeight = (lines.length * fontSize) + ((lines.length + 1) * padding);

            // --- PERBAIKAN: Membuat Kanvas Menjadi Kotak ---
            // Ambil sisi terpanjang untuk dijadikan ukuran kanvas
            const canvasSize = Math.max(requiredWidth, requiredHeight);
            
            const canvas = createCanvas(canvasSize, canvasSize); // Gunakan ukuran yang sama untuk lebar & tinggi
            const ctx = canvas.getContext('2d');
            // --- AKHIR PERBAIKAN ---

            // --- Menggambar Teks ke Kanvas ---
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height); // Latar belakang putih
            ctx.fillStyle = 'black';
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.textBaseline = 'middle'; // Penting untuk penempatan vertikal

            // Hitung total tinggi blok teks untuk menempatkannya di tengah kanvas
            const totalTextHeight = (lines.length * fontSize) + ((lines.length - 1) * padding);
            const startY = (canvas.height - totalTextHeight) / 2;

            lines.forEach((line, index) => {
                const wordsInLine = line.split(' ');
                const y = startY + (index * (fontSize + padding));

                if (index < lines.length - 1 && wordsInLine.length > 1) {
                    // Logika rata kiri-kanan untuk semua baris kecuali baris terakhir
                    const totalWordsWidth = ctx.measureText(wordsInLine.join('')).width;
                    const totalSpacing = requiredWidth - (padding * 2) - totalWordsWidth;
                    const spaceBetweenWords = totalSpacing / (wordsInLine.length - 1);
                    
                    let currentX = padding;
                    wordsInLine.forEach(word => {
                        ctx.fillText(word, currentX, y);
                        currentX += ctx.measureText(word).width + spaceBetweenWords;
                    });
                } else {
                    // Logika rata kiri untuk baris terakhir
                    ctx.fillText(line, padding, y);
                }
            });

            const imageBuffer = canvas.toBuffer('image/png');

            // --- Membuat dan Mengirim Stiker ---
            const sticker = new Sticker(imageBuffer, {
                pack: 'My Bot',
                author: 'Sticker Text',
                type: StickerTypes.FULL,
                quality: 90,
            });

            await bot.sendMessage(msg.from, await sticker.toMessage(), { quoted: msg });
            await msg.react("✅");

        } catch (error) {
            console.error("Error pada perintah stext:", error);
            await msg.react("❌");
            msg.reply("Terjadi kesalahan saat membuat stiker teks.");
        }
    },
};