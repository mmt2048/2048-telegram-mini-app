import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";
import migrations from "@convex-dev/migrations/convex.config";

const app = defineApp();

app.use(aggregate, { name: "aggregateUserTotalsByDailyBestScore" });
app.use(aggregate, { name: "aggregateUserTotalsByTotalScore" });
app.use(aggregate, { name: "aggregateGamesByUser" });

app.use(migrations);

export default app;
