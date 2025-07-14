// commands/game/werewolf.js

// --- FUNGSI PENTING UNTUK MENGATUR JEDA ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Variabel global untuk menyimpan semua sesi game yang aktif
const werewolfGames = {};

// --- KONFIGURASI DAN DATA GAME ---
const Roles = {
    WEREWOLF: 'WEREWOLF',
    VILLAGER: 'VILLAGER',
    DETECTIVE: 'DETECTIVE', // Seer
    HUNTER: 'HUNTER',
    CUPID: 'CUPID',
    // Anda bisa menambahkan peran lain di sini, misal: DOCTOR, WITCH, dll.
};

const RoleInfo = {
    [Roles.WEREWOLF]: {
        name: "Werewolf 🐺",
        team: "Werewolf",
        description: "Setiap malam, kamu dan werewolf lainnya memilih satu warga untuk dimangsa. Tujuanmu adalah mengeliminasi semua warga desa."
    },
    [Roles.VILLAGER]: {
        name: "Villager 👨‍🌾",
        team: "Villagers",
        description: "Kamu adalah warga biasa. Kamu tidak memiliki kemampuan khusus selain intuisi dan hak suara untuk menggantung tersangka di siang hari. Temukan dan gantung semua werewolf untuk menang."
    },
    [Roles.DETECTIVE]: {
        name: "Detective 🕵️",
        team: "Villagers",
        description: "Setiap malam, kamu bisa memilih satu pemain untuk diselidiki. Bot akan memberitahumu apakah pemain tersebut adalah Werewolf atau bukan. Gunakan informasimu dengan bijak."
    },
    [Roles.HUNTER]: {
        name: "Hunter 🏹",
        team: "Villagers",
        description: "Kamu adalah pemburu tangguh. Jika kamu terbunuh, baik oleh werewolf di malam hari atau digantung di siang hari, kamu memiliki satu kesempatan terakhir untuk menembak dan membunuh satu pemain lain."
    },
    [Roles.CUPID]: {
        name: "Cupid 💘",
        team: "Villagers",
        description: "Pada malam pertama, kamu akan memilih dua pemain (bisa termasuk dirimu sendiri) untuk menjadi sepasang kekasih. Jika salah satu dari mereka mati, yang lainnya akan ikut mati karena patah hati."
    }
};

// --- FUNGSI-FUNGSI UTAMA GAME ---

/** Mengacak dan membagikan peran ke pemain */
function assignRoles(players) {
    const playerIds = players.map(p => p.id);
    let assignedRoles = [];
    const playerCount = playerIds.length;

    // Logika pembagian peran sederhana (bisa dikembangkan lebih lanjut)
    if (playerCount >= 5) {
        assignedRoles.push(Roles.WEREWOLF, Roles.DETECTIVE, Roles.CUPID, Roles.HUNTER);
        if (playerCount >= 7) {
            assignedRoles.push(Roles.WEREWOLF);
        }
    }
    while (assignedRoles.length < playerCount) {
        assignedRoles.push(Roles.VILLAGER);
    }

    // Acak peran dan berikan ke pemain
    assignedRoles = assignedRoles.sort(() => Math.random() - 0.5);
    players.forEach((player, index) => {
        player.role = assignedRoles[index];
        player.isAlive = true;
    });
}

/** Mengirim informasi peran ke pemain secara pribadi */
async function sendRoleInfo(bot, player) {
    const role = RoleInfo[player.role];
    if (!role) return;

    let message = `Selamat malam, ${player.name}!\n\nDi game ini, kamu berperan sebagai *${role.name}*.\n\n*Tim:* ${role.team}\n*Deskripsi Peran:*\n${role.description}`;

    // Jika werewolf, beri tahu siapa teman-temannya
    if (player.role === Roles.WEREWOLF) {
        const game = werewolfGames[player.groupId];
        const werewolves = game.players.filter(p => p.role === Roles.WEREWOLF && p.id !== player.id);
        if (werewolves.length > 0) {
            message += `\n\nTeman werewolf-mu adalah:\n${werewolves.map(w => `- ${w.name}`).join('\n')}`;
        } else {
            message += `\n\nKamu adalah satu-satunya werewolf malam ini.`
        }
    }

    try {
        await bot.sendMessage(player.id, { text: message });
    } catch (e) {
        console.error(`Gagal mengirim peran ke ${player.name}:`, e);
        // Kirim pemberitahuan di grup jika PM gagal
        const groupMessage = `Maaf, ${player.name}, saya tidak bisa mengirim peranmu melalui PM. Pastikan kamu tidak memblokir bot dan coba lagi.`;
        await bot.sendMessage(player.groupId, { text: groupMessage, mentions: [player.id] });
    }
}


// --- LOGIKA UTAMA PERINTAH BOT ---

module.exports = {
  name: "ww",
  alias: ["werewolf", "wwcreate", "wwjoin", "wwstart", "wwend", "vote"],
  description: "Memainkan game Werewolf.",
  category: "game",
  execute: async (msg, { bot, args, command, usedPrefix }) => {
    const from = msg.from;
    const senderId = msg.sender;
    const senderName = msg.pushName || "Pemain";

    // --- Perintah Bantuan ---
    if (command === "ww" && !args.length) {
        const helpMessage = `🐺 *Game Werewolf Bot* 🐺\n\nSebuah permainan deduksi sosial yang penuh intrik dan tipu daya. Bisakah warga desa menemukan werewolf sebelum semuanya terlambat?\n\n*Perintah Lobi:*\n- \`${usedPrefix}wwcreate\`: Membuat lobi game baru.\n- \`${usedPrefix}wwjoin\`: Bergabung ke lobi yang ada.\n- \`${usedPrefix}wwstart\`: Memulai permainan (hanya host).\n- \`${usedPrefix}wwend\`: Menghentikan permainan (hanya host).\n\n*Perintah Saat Bermain:*\n- \`${usedPrefix}vote @pemain\`: Memberikan suara untuk menggantung pemain di siang hari.\n\n*Cara Bermain:*\n1. Buat lobi dengan \`${usedPrefix}wwcreate\`.\n2. Ajak teman-temanmu untuk bergabung dengan \`${usedPrefix}wwjoin\`.\n3. Setelah semua siap, host memulai game dengan \`${usedPrefix}wwstart\`.\n4. Setiap pemain akan menerima perannya masing-masing melalui chat pribadi (PM).\n5. Ikuti narasi dan instruksi dari bot di grup dan di PM untuk menjalankan aksimu setiap malam dan siang.`;
        return msg.reply(helpMessage);
    }
    
    // --- Logika Lobi ---
    if (command === "wwcreate") {
        if (werewolfGames[from]) return msg.reply("⚠️ Lobi game Werewolf sudah ada di grup ini.");
        werewolfGames[from] = {
            host: senderId,
            players: [{ id: senderId, name: senderName, groupId: from }],
            status: 'waiting'
        };
        return msg.reply(`✅ Lobi Werewolf berhasil dibuat oleh ${senderName}!\n\nPemain lain bisa bergabung dengan mengetik: \`${usedPrefix}wwjoin\``, { mentions: [senderId] });
    }
    
    if (command === "wwjoin") {
        const game = werewolfGames[from];
        if (!game || game.status !== 'waiting') return msg.reply("⚠️ Tidak ada lobi yang sedang menunggu pemain.");
        if (game.players.some(p => p.id === senderId)) return msg.reply("⚠️ Kamu sudah berada di dalam lobi.");
        
        game.players.push({ id: senderId, name: senderName, groupId: from });
        const playerList = game.players.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
        return msg.reply(`✅ ${senderName} berhasil bergabung!\n\n*Daftar Pemain:*\n${playerList}`, { mentions: [senderId] });
    }

    if (command === "wwend") {
        const game = werewolfGames[from];
        if (!game) return msg.reply("⚠️ Tidak ada game yang sedang berjalan.");
        if (game.host !== senderId) return msg.reply("⚠️ Hanya host yang bisa menghentikan permainan.");
        
        delete werewolfGames[from];
        return msg.reply("🛑 Permainan Werewolf telah dihentikan oleh host.");
    }
    
    // --- Memulai Game ---
    if (command === "wwstart") {
        const game = werewolfGames[from];
        if (!game || game.host !== senderId) return msg.reply("⚠️ Hanya host yang bisa memulai game.");
        if (game.status === 'playing') return msg.reply("⚠️ Game sudah berjalan.");
        if (game.players.length < 5) return msg.reply("⚠️ Butuh minimal 5 pemain untuk memulai game ini.");

        await msg.reply("Baiklah, para warga telah berkumpul. Permainan akan segera dimulai...");
        await sleep(2000);

        game.status = 'playing';
        assignRoles(game.players);
        
        await msg.reply("Peran rahasia sedang dibagikan... Silakan periksa chat pribadi (PM) dari bot.");
        
        for (const player of game.players) {
            await sendRoleInfo(bot, player);
            await sleep(1000); // Jeda agar tidak dianggap spam
        }

        await sleep(3000);
        await msg.reply("Semua pemain telah menerima perannya. Kisah desa ini akan segera dimulai...\n\n---\n\n*NARASI:*\nSaat senja tiba, kabut tebal mulai menyelimuti desa. Suasana yang tadinya ramai kini menjadi sunyi senyap. Semua warga bergegas masuk ke rumah masing-masing, mengunci pintu, dan berharap bisa melewati malam yang mencekam ini dengan selamat.\n\n*Malam pertama telah tiba... Semua pemain, silakan tidur.* 🌙");
        
        // Di sini Anda akan memulai siklus malam pertama
        // (Logika siklus malam-siang akan sangat kompleks dan perlu dibuat secara bertahap)
        // Untuk saat ini, ini adalah dasar untuk memulai game.
    }
    
    // --- Logika Voting (Contoh) ---
    if (command === "vote") {
        const game = werewolfGames[from];
        if (!game || game.status !== 'playing') return msg.reply("⚠️ Tidak ada game yang sedang berjalan.");
        
        // Cek apakah sedang fase voting
        // if (game.phase !== 'voting') return msg.reply("⚠️ Sekarang bukan waktunya untuk voting.");

        const target = msg.mentionedJid?.[0];
        if (!target) return msg.reply("⚠️ Kamu harus me-mention pemain yang ingin kamu vote.");

        // ... (Logika untuk menyimpan dan menghitung vote)

        return msg.reply(`${senderName} telah memberikan suaranya untuk menggantung ${bot.getName(target)}.`);
    }
  },
};