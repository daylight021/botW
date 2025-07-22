const { createCanvas } = require('canvas');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

/**
 * Fungsi untuk memotong teks menjadi dua bagian yang seimbang.
 * @param {string} text Teks input.
 * @returns {{ part1: string, part2: string }} Objek berisi dua bagian teks.
 */
function splitText(text) {
    const words = text.split(' ');
    if (words.length === 1) {
        // Jika hanya satu kata, bagi dua di tengah
        const mid = Math.ceil(text.length / 2);
        return { part1: text.substring(0, mid), part2: text.substring(mid) };
    }

    const middleIndex = Math.ceil(words.length / 2);
    const part1 = words.slice(0, middleIndex).join(' ');
    const part2 = words.slice(middleIndex).join(' ');
    return { part1, part2 };
}

module.exports = {
    name: "stext",
    alias: ["stickertext", "stikerteks"],
    description: "Membuat stiker dari teks yang dipotong menjadi dua baris.",
    category: "converter",
    execute: async (msg, { bot, args, usedPrefix, command }) => {
        const text = args.join(' ');

        if (!text) {
            return msg.reply(`Kirim perintah dengan format:\n*${usedPrefix + command} <teks kamu>*\n\nContoh:\n${usedPrefix + command} hidup memang tidak selalu indah`);
        }

        try {
            await msg.react("🎨");

            const { part1, part2 } = splitText(text);

            // --- Pengaturan Kanvas dan Teks ---
            const canvas = createCanvas(1, 1); // Ukuran sementara
            const ctx = canvas.getContext('2d');
            const fontSize = 60; // Ukuran font
            const fontFamily = 'Helvetica-Bold, sans-serif'; // Font tebal
            const padding = 20; // Jarak dari tepi

            ctx.font = `${fontSize}px ${fontFamily}`;

            // Mengukur lebar teks terpanjang untuk menentukan lebar kanvas
            const metrics1 = ctx.measureText(part1);
            const metrics2 = ctx.measureText(part2);
            const textWidth = Math.max(metrics1.width, metrics2.width);

            // Menentukan ukuran kanvas akhir
            const canvasWidth = textWidth + (padding * 2);
            const canvasHeight = (fontSize * 2) + (padding * 3); // Dua baris teks + padding

            // Mengatur ulang ukuran kanvas
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            // --- Menggambar Teks ke Kanvas ---
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height); // Latar belakang putih

            ctx.fillStyle = 'black';
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.textAlign = 'center'; // Teks di tengah
            ctx.textBaseline = 'middle';

            // Menggambar baris pertama
            ctx.fillText(part1, canvas.width / 2, (canvas.height / 2) - (fontSize / 2));
            // Menggambar baris kedua
            ctx.fillText(part2, canvas.width / 2, (canvas.height / 2) + (fontSize / 2) + (padding / 2));

            const imageBuffer = canvas.toBuffer('image/png');

            // --- Membuat dan Mengirim Stiker ---
            const sticker = new Sticker(imageBuffer, {
                pack: 'My Bot',
                author: 'Sticker Text',
                type: StickerTypes.FULL,
                quality: 80,
            });

            await bot.sendMessage(msg.from, await sticker.toMessage(), { quoted: msg });

        } catch (error) {
            console.error("Error pada perintah stext:", error);
            await msg.react("❌");
            msg.reply("Terjadi kesalahan saat membuat stiker teks.");
        }
    },
};