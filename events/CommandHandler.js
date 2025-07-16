const Serializer = require("../lib/Serializer");
const { getGroupMetadata } = require("../lib/CachedGroupMetadata");

// Anti-banjir global
const userSpamData = new Map();
const SPAM_LIMIT = 5;
const SPAM_COOLDOWN = 10 * 1000;

function isUserSpamming(userId) {
    if (userSpamData.has(userId)) {
        const userData = userSpamData.get(userId);
        const { count, lastCommandTime } = userData;
        if (Date.now() - lastCommandTime < SPAM_COOLDOWN) {
            if (count >= SPAM_LIMIT) {
                userData.lastCommandTime = Date.now();
                return true; 
            }
            userData.count++;
        } else {
            userData.count = 1;
            userData.lastCommandTime = Date.now();
        }
    } else {
        userSpamData.set(userId, { count: 1, lastCommandTime: Date.now() });
    }
    return false;
}

module.exports = {
  async chatUpdate(messages) {
    // 1. Serialisasi pesan di awal
    const msg = await Serializer.serializeMessage(this, messages.messages[0]);
    let groupMetadata = null;

    try {
      // Pengecekan awal yang lebih sederhana
      if (!msg.message || msg.isBaileys) return;

      const botPrefix = new RegExp("^[" + "/!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-".replace(/[|\\{}()[\]^$+*?.\-\^]/g, "\\$&") + "]");
      
      // Menggunakan msg.text yang sudah diserialisasi
      const isCommand = msg.text && botPrefix.test(msg.text);

      if (isCommand) {
          if (isUserSpamming(msg.sender)) {
              if (userSpamData.get(msg.sender).count === SPAM_LIMIT) {
                  return msg.reply("⚠️ Anda mengirim perintah terlalu cepat! Mohon tunggu beberapa saat.");
              }
              return;
          }
      }

      // Handler lain tetap menggunakan 'msg'
      require("./DatabaseHandler")(msg, this);
      require("./AFKHandler")(msg, this);

      const isOwner = [this.user.id.split("@")[0], process.env.owner].map((v) => v?.replace(/[^0-9]/g, "")).includes(msg.sender.split("@")[0]) || msg.key.fromMe;
      if (isOwner) userSpamData.delete(msg.sender);

      if (isCommand || msg.isGroup) {
          try {
              groupMetadata = msg.isGroup ? await getGroupMetadata(msg.from, this) : null;
          } catch (e) {
              console.error(`Gagal mengambil metadata untuk grup ${msg.from}:`, e);
          }
      }
      
      const participants = groupMetadata?.participants || [];
      const user = participants.find((u) => u.id == msg.sender) || {};
      const bot = participants.find((u) => u.id == Serializer.decodeJid(this.user.id)) || {};
      const isAdmin = user.admin === "admin" || user.admin === "superadmin";
      const isBotAdmin = bot.admin === "admin" || bot.admin === "superadmin";

      if (isCommand) {
        const usedPrefix = msg.text.match(botPrefix)[0];
        const args = msg.text.slice(usedPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = this.commands.get(commandName);
        if (!command) return;

        // --- PERBAIKAN UTAMA ADA DI SINI ---
        // Semua pengecekan dan eksekusi sekarang menggunakan 'msg' yang sudah lengkap
        if (command.admin && !isAdmin) return msg.reply("Perintah ini hanya untuk admin grup.");
        if (command.botAdmin && !isBotAdmin) return msg.reply("Bot harus menjadi admin untuk menjalankan perintah ini.");
        if (command.group && !msg.isGroup) return msg.reply("Perintah ini hanya bisa digunakan di dalam grup.");
        if (command.owner && !isOwner) return msg.reply("Perintah ini khusus untuk Owner Bot.");

        // Objek 'extra' sekarang lebih rapi
        const extra = { 
            bot: this, 
            usedPrefix, 
            participants, 
            groupMetadata, 
            args, 
            command: commandName 
        };

        try {
          // Memanggil 'execute' dengan 'msg' yang sudah diserialisasi
          await command.execute(msg, extra);
        } catch (error) {
          console.error(`Error saat menjalankan perintah '${commandName}':`, error);
          msg.reply("Terjadi kesalahan internal saat menjalankan perintah.");
        }
      }
    } catch (e) {
      console.error("Terjadi error di chatUpdate:", e);
    } finally {
      // Fungsi print tetap menggunakan 'msg'
      require("../lib/print")(this, msg, groupMetadata);
    }
  },
};