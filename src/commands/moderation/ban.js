const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const fs = require("fs");

function readConfig() {
  try {
    const data = fs.readFileSync("config.json", "utf8");
    const config = JSON.parse(data);
    return config;
  } catch (error) {
    console.error(
      "Hiba történt a konfigurációs fájl beolvasása közben:",
      error
    );
    return { caseCount: 0 };
  }
}

function writeConfig(config) {
  const json = JSON.stringify(config, null, 2);
  try {
    fs.writeFileSync("config.json", json, "utf8");
  } catch (error) {
    console.error("Hiba akadt a konfigurációs fájlba írás közben:", error);
  }
}

const config = readConfig();
let caseCount = config.caseCount || 0;

function parseDuration(duration) {
  const regex = /(\d+)([dhms])/g;
  let totalMs = 0;
  const units = { d: 86400000, h: 3600000, m: 60000, s: 1000 };

  for (const match of duration.matchAll(regex)) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    totalMs += value * units[unit];
  }

  return totalMs;
}

async function deleteAllMessages(guild, userId) {
  const channels = guild.channels.cache.filter((channel) =>
    channel.isTextBased()
  );

  const promises = channels.map((channel) => {
    const messages = channel.messages.cache.filter(
      (msg) => msg.author.id === userId
    );

    return channel.bulkDelete(messages, true);
  });

  await Promise.all(promises);
}

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    const targetUserInput = interaction.options.get("célszemélyek").value;
    const reason =
      interaction.options.get("indoklás")?.value || "`Nincs meghatározva.`";
    const deleteMessageSeconds =
      interaction.options.get("üzenettörlés")?.value || 0;
    const proofAttachment = interaction.options.get("bizonyíték")?.attachment;
    const duration = interaction.options.get("időtartam")?.value;
    const softBan =
      (interaction.options.get("enyhe")?.value || false) === "true";
    const sendDM = (interaction.options.get("dm")?.value || true) === "true";

    const guild = interaction.guild;

    await interaction.deferReply();

    // Split the input and handle both user IDs and mentions
    const targetUserIds = targetUserInput.split(",").map((item) => {
      item = item.trim();
      // Check if item is a mention and extract the ID
      const mentionMatch = item.match(/^<@!?(\d+)>$/);
      return mentionMatch ? mentionMatch[1] : item;
    });

    const requestUser = await interaction.guild.members.fetch(
      interaction.member.user.id
    );

    let durationInBanResult = "";
    if (duration && !softBan) {
      durationInBanResult = `:alarm_clock: **Időtartam:** \`${duration}\` :hourglass_flowing_sand:`;
    } else if (softBan) {
      durationInBanResult = `:alarm_clock: **Időtartam:** \`Azonnal feloldásra került.\` :hourglass_flowing_sand:`;
    }

    const banResult = new EmbedBuilder()
      .setTitle("Kitiltás eredménye")
      .setDescription(
        `:scroll: **Ok:** ${reason}\n:detective: **Végrehajtó:** ${requestUser}\n${durationInBanResult}`
      )
      .setColor("#f03030");

    const banDetails = [];
    for (const targetUserId of targetUserIds) {
      let targetUser;
      try {
        targetUser = await client.users.fetch(targetUserId);
      } catch (error) {
        console.error(
          "Hiba akadt a célszemély globális lekérdezése közben:",
          error
        );
        continue;
      }

      let guildTargetUser;
      let isHackBan = false;
      try {
        guildTargetUser = await interaction.guild.members.fetch(targetUserId);
      } catch (error) {
        if (error.code !== 10007) {
          console.error(
            "Hiba akadt a célszemély szerveren történő lekérdezése közben:",
            error
          );
          continue;
        } else {
          isHackBan = true;
        }
      }

      if (!targetUser) {
        continue;
      }

      if (targetUser.id === interaction.guild.ownerId) {
        await interaction.editReply(
          ":interrobang: Ne hülyéskedj, nem tilthatod ki a górét! :-D :interrobang:"
        );
        return;
      }

      if (guildTargetUser) {
        const targetUserRolePosition = guildTargetUser.roles.highest.position; // Highest role of the target user
        const requestUserRolePosition =
          interaction.member.roles.highest.position; // Highest role of the user running the cmd
        const botRolePosition =
          interaction.guild.members.me.roles.highest.position; // Highest role of the bot

        if (targetUserRolePosition >= botRolePosition) {
          await interaction.editReply(
            "<:tiltott:1245407739153223690> A célszemély a felettesem, nem áll módomban kitiltani. :-D"
          );
          return;
        }

        if (
          targetUserRolePosition >= requestUserRolePosition &&
          requestUser.id != interaction.guild.ownerId
        ) {
          await interaction.editReply(
            ":warning: Ezt a felhasználót nem tilthatod ki, mivel ugyanazon vagy magasabb szintű jogosultságokkal rendelkezik, mint te. :warning:"
          );
          return;
        }
      }

      banDetails.push(
        `<:semmi:1245402023243812925> :ok_hand: ${targetUser} [\`${targetUserId}\`]`
      );

      const requestUserName = interaction.member.user.tag;
      const targetUserName = targetUser.tag;

      let banType = "Általános kitiltás";
      if (softBan) {
        banType = "Enyhe kitiltás";
      } else if (isHackBan) {
        banType = "Távolléti kitiltás";
      }

      const addToCases = new EmbedBuilder()
        .addFields(
          {
            name: "Eset:",
            value: `\`${caseCount + 1}\` <:pipa:1245501324607619103>`,
            inline: true,
          },
          { name: "Típus:", value: `\`${banType}\``, inline: true },
          {
            name: "Végrehajtó:",
            value: `\`@${requestUserName}\` :tickets: :tools:`,
            inline: true,
          },
          {
            name: "Célszemély:",
            value: `:knife: \`@${targetUserName}\` :anger:`,
            inline: false,
          },
          { name: "Ok:", value: `${reason}`, inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setColor("#f03030")
        .setTimestamp();

      try {
        if (sendDM) {
          const dmEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle("Kitiltottak")
            .setDescription(
              `Kitiltottak a következő szerverről: **${interaction.guild.name}**`
            )
            .addFields(
              {
                name: "Kitiltotta:",
                value: `${requestUserName}`,
                inline: true,
              },
              { name: "Indoklás:", value: `${reason}`, inline: false }
            )
            .setTimestamp();

          try {
            await targetUser.send({ embeds: [dmEmbed] });
          } catch (error) {
            if ((error.code = 50007)) {
              console.error(`Cannot send DM to ${targetUser.tag}`);
            } else {
              console.error(`Failed to send DM to ${targetUser.tag}:`, error);
            }
          }
        }

        const unbanNotification = new EmbedBuilder()
          .setTitle("Feloldás")
          .setDescription(
            `A következő felhasználó kitiltása feloldásra került: \`@${targetUserName}\``
          )
          .setColor("#00ff00")
          .setTimestamp();

        const targetChannel = await client.channels.fetch(
          process.env.TARGET_CHANNEL_ID
        );

        if (softBan) {
          await deleteAllMessages(guild, targetUserId);

          await guild.members.ban(targetUserId, { reason });
          await guild.members.unban(targetUserId, reason);
          console.log(`Felhasználó kitiltása feloldva: ${targetUserName}`);
        } else {
          await guild.members.ban(targetUserId, {
            deleteMessageSeconds,
            reason,
          });
        }

        if (proofAttachment) {
          const attachment = new AttachmentBuilder(proofAttachment.url);
          await targetChannel.send({
            files: [attachment],
            embeds: [addToCases],
          });
        } else if (softBan) {
          await targetChannel.send({ embeds: [addToCases, unbanNotification] });
        } else {
          await targetChannel.send({ embeds: [addToCases] });
        }

        // Schedule unban if duration is set
        if (duration && !softBan) {
          const durationMs = parseDuration(duration);
          setTimeout(async () => {
            try {
              await interaction.guild.members.unban(targetUserId);
              console.log(`Felhasználó kitiltása feloldva: ${targetUserName}`);
              await targetChannel.send({ embeds: [unbanNotification] });
            } catch (error) {
              console.log(`Nem sikerült feloldani a kitiltást: ${error}`);
            }
          }, durationMs);
        }

        caseCount += 1;
        config.caseCount = caseCount;
        console.log("Az esetek száma frissült:", caseCount);
        writeConfig(config);
      } catch (error) {
        console.log(`Hiba akadt a kitiltás végrehajtása közben: ${error}`);
      }
    }

    if (banDetails.length > 0) {
      banResult.addFields({
        name: "Kitiltva:",
        value: banDetails.join("\n"),
        inline: false,
      });
      await interaction.editReply({ embeds: [banResult] });
    } else {
      await interaction.editReply(
        "Nem sikerült egy felhasználót sem kitiltani."
      );
    }
  },

  name: "ban",
  description: "Felhasználók kitiltása (ajánlott)",
  options: [
    {
      name: "célszemélyek",
      description:
        "A kitiltandó felhasználók (@említések vagy felhasználói azonosítók vesszővel elválasztva)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "indoklás",
      description: "A kitiltás indoklása, ha van",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "időtartam",
      description: "A kitiltás időtartama (pl. 1d, 2h, 30m)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "bizonyíték",
      description: "Kép a kitiltást kiváltó okról, ha van",
      type: ApplicationCommandOptionType.Attachment,
      required: false,
    },
    {
      name: "üzenettörlés",
      description:
        "Az utóbbi hány másodperc üzenete legyen törölve (alapból: 0)",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: "enyhe",
      description: "= Purge és kick (Ignorálja: időtartam és üzenettörlés)",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        {
          name: "Igaz",
          value: "true",
        },
        {
          name: "Hamis",
          value: "false",
        },
      ],
    },
    {
      name: "dm",
      description:
        "Kitiltásról szóló értesítés küldése DM-ben (alapértelmezett: true)",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        {
          name: "Igaz",
          value: "true",
        },
        {
          name: "Hamis",
          value: "false",
        },
      ],
    },
  ],
  permissionsRequired: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
};
