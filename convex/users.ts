import { v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";

export const getUser = query({
    args: {
        telegramUser: v.any(),
    },
    handler: async (ctx, args) => {
        return await getUserByTelegramUser(ctx, args.telegramUser);
    },
});

export const ensureUser = mutation({
    args: {
        telegramUser: v.any(),
    },
    handler: async (ctx, args) => {
        const user = await getOrCreateUserByTelegramUser(
            ctx,
            args.telegramUser
        );
        return user;
    },
});

export async function getUserByTelegramId(ctx: QueryCtx, telegramId: number) {
    const user = await ctx.db
        .query("users")
        .withIndex("by_telegram_id", (q) => q.eq("telegramId", telegramId))
        .first();

    if (!user) {
        return null;
    }

    return user;
}

export const setUserNickname = mutation({
    args: {
        telegramUser: v.any(),
        nickname: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await getOrCreateUserByTelegramUser(
            ctx,
            args.telegramUser
        );
        if (!user) return null;

        await ctx.db.patch(user._id, { nickname: args.nickname });
    },
});

export async function getUserByTelegramUser(
    ctx: QueryCtx,
    telegramUser: {
        id: number;
        firstName?: string;
        lastName?: string;
        username?: string;
    }
) {
    if (!telegramUser?.id) return null;
    return await getUserByTelegramId(ctx, telegramUser.id);
}

export async function getOrCreateUserByTelegramUser(
    ctx: MutationCtx,
    telegramUser: {
        id: number;
        firstName?: string;
        lastName?: string;
        username?: string;
    }
) {
    const existing = await getUserByTelegramId(ctx, telegramUser.id);
    if (existing) return existing;

    const username = telegramUser.username ?? "";
    const firstName = telegramUser.firstName ?? "";
    const lastName = telegramUser.lastName ?? "";
    const nickname = generateRandomNickname();

    const newUserId = await ctx.db.insert("users", {
        telegramId: telegramUser.id,
        username: username,
        firstName: firstName,
        lastName: lastName,
        nickname: nickname,
    });

    return await ctx.db.get(newUserId);
}

const ADJECTIVES = [
    "Танцующий",
    "Сияющий",
    "Могучий",
    "Летающий",
    "Скользящий",
    "Смеющийся",
    "Грустный",
    "Веселый",
    "Мудрый",
    "Хитрый",
    "Быстрый",
    "Медленный",
    "Сонный",
    "Бодрый",
    "Сильный",
    "Тихий",
    "Громкий",
    "Яркий",
    "Тусклый",
    "Храбрый",
    "Забавный",
    "Умный",
    "Добрый",
    "Злой",
    "Величественный",
    "Сказочный",
    "Стремительный",
    "Мечтательный",
    "Огненный",
    "Холодный",
    "Радостный",
    "Печальный",
    "Необычный",
    "Волшебный",
    "Грозный",
    "Колючий",
    "Теплый",
];

const NOUNS = [
    "Кот",
    "Дракон",
    "Енот",
    "Медведь",
    "Лев",
    "Тигр",
    "Слон",
    "Волк",
    "Заяц",
    "Орёл",
    "Сокол",
    "Пингвин",
    "Краб",
    "Кит",
    "Дельфин",
    "Попугай",
    "Ёжик",
    "Филин",
    "Суслик",
    "Барсук",
    "Павлин",
    "Жираф",
    "Крокодил",
    "Верблюд",
    "Муравей",
];

function generateRandomNickname(): string {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adjective} ${noun}`;
}
