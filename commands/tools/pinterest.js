const axios = require('axios');

// Mengambil cookie dari variabel lingkungan (.env)
const PINTEREST_COOKIE = process.env.PINTEREST_COOKIE;

// Fungsi untuk memilih elemen secara acak dari sebuah array
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Fungsi utama untuk mencari di Pinterest
async function pinterestSearch(query) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!PINTEREST_COOKIE) {
        return reject(new Error("Cookie Pinterest belum diatur di file .env Anda."));
      }

      // Mengekstrak csrftoken dari cookie untuk digunakan di header
      const csrfToken = PINTEREST_COOKIE.match(/csrftoken=([a-zA-Z0-9]+)/)?.[1] || '';

      const headers = {
        'accept': 'application/json, text/javascript, */*, q=0.01',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'referer': 'https://www.pinterest.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'x-requested-with': 'XMLHttpRequest',
        'x-csrftoken': csrfToken,
        'cookie': PINTEREST_COOKIE
      };
      
      const { data } = await axios.get('https://www.pinterest.com/resource/BaseSearchResource/get/', {
        headers,
        params: {
          source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
          data: JSON.stringify({
            options: { query, scope: "pins" },
            context: {},
          }),
        },
      });
      
      const results = data.resource_response?.data?.results;
      if (results && results.length > 0) {
        const imageUrls = results.map(item => item.images?.['736x']?.url).filter(Boolean);
        resolve(imageUrls);
      } else {
        resolve([]);
      }
    } catch (error) {
      console.error("[PINTEREST ERROR]", error);
      reject(error); 
    }
  });
}

// Module exports dan logika execute
module.exports = {
  name: "pin",
  alias: ["pinterest"],
  description: "Mencari gambar dari Pinterest.",
  category: "tools",
  execute: async (msg, { bot, args, usedPrefix, command }) => {
    if (!args.length) {
      const helpMessage = `*Pencarian Pinterest* 🔎\n\nFitur ini digunakan untuk mencari gambar dari Pinterest.\n\n*Cara Penggunaan:*\n\`${usedPrefix + command} <query>\`\nContoh: \`${usedPrefix + command} cyberpunk city\`\n\n*Opsi Tambahan:*\n- \`-j <jumlah>\`: Untuk mengirim beberapa gambar sekaligus (maksimal 5).\n  Contoh: \`${usedPrefix + command} cat -j 3\``;
      return bot.sendMessage(msg.from, { text: helpMessage }, { quoted: msg });
    }

    let query = [];
    let count = 1;
    // Fitur video dihilangkan sementara untuk stabilitas
    
    for (let i = 0; i < args.length; i++) {
      if (args[i].toLowerCase() === '-j') {
        count = parseInt(args[i + 1], 10) || 1;
        count = Math.min(Math.max(1, count), 5);
        i++;
      } else {
        query.push(args[i]);
      }
    }
    const searchQuery = query.join(' ');
    if (!searchQuery) return msg.reply("Mohon masukkan query pencarian.");

    try {
        await msg.react("⏳");
        const results = await pinterestSearch(searchQuery);

        if (!results.length) {
            await msg.react("❌");
            return msg.reply("Maaf, tidak ada hasil yang ditemukan. Coba dengan kata kunci lain atau perbarui cookie Anda.");
        }

        const itemsToSend = pickRandom(results, count);
        for (let i = 0; i < count; i++) {
          const randomMedia = pickRandom(results);
          if (randomMedia) {
              await bot.sendMessage(msg.from, { 
                  image: { url: randomMedia }, 
                  caption: `Hasil pencarian untuk: *${searchQuery}*` 
              }, { quoted: msg });
          }
        }
        await msg.react("✅");

    } catch (error) {
        await msg.react("❌");
        msg.reply(`Terjadi kesalahan. Pastikan PINTEREST_COOKIE di file .env sudah benar dan tidak kedaluwarsa.\n\n_Detail: ${error.message}_`);
    }
  },
};