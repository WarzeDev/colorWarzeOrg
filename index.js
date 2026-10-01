import {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder
} from "discord.js";
import { parseColor, randomColor } from "./colors";
import { deleteRoleRecord, getRoleId, saveRoleId } from "./db";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("Missing DISCORD_TOKEN. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const client = new Client({
  // GuildMembers is a privileged intent: enable it in the Developer Portal.
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const roleCommand = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Change the name and/or color of your personal role")
  .addStringOption((o) =>
    o
      .setName("name")
      .setDescription("New role name")
      .setMinLength(1)
      .setMaxLength(100),
  )
  .addStringOption((o) =>
    o.setName("code").setDescription("New color as a hex code, e.g. #ff8800"),
  );

/**
 * Finds the member's role via the database, or creates one if they don't have
 * one yet (or it was deleted). Applies the given name/color if provided.
 */
async function applyRole(
  member,
  opts,
) {
  const { guild } = member;
  const reason = "color.Warze.org";

  const storedId = getRoleId(guild.id, member.id);
  let role = null;
  if (storedId) {
    role =
      guild.roles.cache.get(storedId) ??
      (await guild.roles.fetch(storedId).catch(() => null));
  }

  if (role) {
    role = await role.edit({
      name: opts.name ?? role.name,
      color: opts.color ?? role.color,
      reason,
    });
    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role, reason);
    }
    return { role, created: false };
  }

  role = await guild.roles.create({
    name: opts.name ?? member.user.username,
    color: opts.color ?? randomColor(),
    reason,
  });
  await member.roles.add(role, reason);
  saveRoleId(guild.id, member.id, role.id);
  return { role, created: true };
}

client.once(Events.ClientReady, async (c) => {
  await c.application.commands.set([roleCommand.toJSON()]);
  console.log(`Logged in as ${c.user.tag}, serving ${c.guilds.cache.size} server(s).`);
});

// New member: create a random-colored role named after them and welcome them.
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) return;

  try {
    const { role } = await applyRole(member, {});

    // The system channel is where Discord posts the "X joined the server" message.
    const channel = member.guild.systemChannel;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(role.color)
      .setDescription(
        `Welcome to **${member.guild.name}** you are member **#${member.guild.memberCount}**. ` +
          `You were given ${role} with a random color, but you can change it with /role`,
      );

    await channel.send({
      content: `${member}`,
      embeds: [embed],
      allowedMentions: { users: [member.id] },
    });
  } catch (err) {
    console.error(`Failed to set up ${member.user.tag} in ${member.guild.name}:`, err);
  }
});

// Member left: remove their role so the server doesn't hit Discord's 250 role cap.
client.on(Events.GuildMemberRemove, async (member) => {
  const roleId = getRoleId(member.guild.id, member.id);
  if (!roleId) return;

  deleteRoleRecord(member.guild.id, member.id);
  await member.guild.roles.delete(roleId, "Member left").catch(() => {});
});

// /role [name] [code]
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "role") return;

  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "This command only works inside a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const name = interaction.options.getString("name")?.trim() || undefined;
  const code = interaction.options.getString("code");

  if (!name && !code) {
    await interaction.reply({
      content: "Give me a name, a color code, or both. Example: `/role name:Sunset code:#ff8800`",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let color;
  if (code) {
    const parsed = parseColor(code);
    if (parsed === null) {
      await interaction.reply({
        content: "That isn't a valid hex color. Try something like `#ff8800` or `f80`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    color = parsed;
  }

  await interaction.deferReply();

  try {
    const { role, created } = await applyRole(interaction.member, { name, color });

    const embed = new EmbedBuilder()
      .setColor(role.color)
      .setTitle(created ? "Role created" : "Role updated")
      .setDescription(`You are now ${role} (\`${role.hexColor}\`).`);

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("Failed to update role:", err);
    await interaction.editReply(
      "I couldn't update your role. Make sure I have **Manage Roles** and that my role is above the member roles I create.",
    );
  }
});

client.login(token);
