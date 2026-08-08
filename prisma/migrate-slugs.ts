/**
 * 将数据库中已有的中文公司 slug 迁移为 ASCII slug
 * 运行: npx tsx prisma/migrate-slugs.ts
 */
import { PrismaClient } from "@prisma/client";
import { generateSlug } from "../src/lib/slug";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true },
  });

  let updated = 0;
  for (const company of companies) {
    const newSlug = generateSlug(company.name);
    if (newSlug !== company.slug) {
      // Check for duplicate slug
      const existing = await prisma.company.findFirst({
        where: { slug: newSlug, id: { not: company.id } },
      });
      if (existing) {
        // Append unique suffix
        const uniqueSlug = `${newSlug}-${company.id.slice(0, 6)}`;
        console.log(`  冲突: ${company.name} — 使用 ${uniqueSlug}`);
        await prisma.company.update({
          where: { id: company.id },
          data: { slug: uniqueSlug },
        });
      } else {
        await prisma.company.update({
          where: { id: company.id },
          data: { slug: newSlug },
        });
      }
      updated++;
    }
  }

  console.log(`✅ 已更新 ${updated} 个公司的 slug`);

  // Verify
  const verify = await prisma.company.findMany({
    select: { name: true, slug: true },
    orderBy: { name: "asc" },
  });
  console.log("\n当前 slugs:");
  verify.forEach((c) => console.log(`  ${c.name} → ${c.slug}`));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
