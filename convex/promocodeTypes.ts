import { query } from "./_generated/server";

export const getPromocodeTypes = query({
    handler: async (ctx) => {
        return await ctx.db.query("promocodeTypes").collect();
    },
});
