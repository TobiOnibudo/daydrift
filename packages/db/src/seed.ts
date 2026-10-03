/**
 * @daydrift/db — seed script stub. Invoked by `pnpm seed` (docs/12 §1 step 5).
 * TODO: seed a sample city (Overpass query → places rows → enqueue embed jobs).
 * See docs/02-data-model.md "Seeding".
 */
async function main(): Promise<void> {
  console.log('TODO: seed sample city');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
