import { getDb } from "@/lib/db";
import type { PortfolioAssetBreakdown } from "@/lib/portfolio";

type SnapshotRow = {
  id: number;
};

type SnapshotItemRow = {
  symbol: string;
  rank: number;
};

function rankedPositions(positions: PortfolioAssetBreakdown[]) {
  return positions
    .filter((position) => position.value > 0)
    .slice()
    .sort((left, right) => {
      if (left.value !== right.value) {
        return right.value - left.value;
      }

      return left.symbol.localeCompare(right.symbol);
    })
    .map((position, index) => ({
      symbol: position.symbol,
      rank: index + 1,
      value: position.value
    }));
}

export function capturePositionRankSnapshot(
  positions: PortfolioAssetBreakdown[],
  capturedAt = new Date().toISOString()
) {
  const ranked = rankedPositions(positions);

  if (!ranked.length) {
    return null;
  }

  const db = getDb();
  const insertSnapshot = db.prepare(
    `
      INSERT INTO position_rank_snapshots (captured_at)
      VALUES (@capturedAt)
    `
  );
  const insertItem = db.prepare(
    `
      INSERT INTO position_rank_snapshot_items (snapshot_id, symbol, rank, value)
      VALUES (@snapshotId, @symbol, @rank, @value)
    `
  );

  const insertSnapshotTransaction = db.transaction(() => {
    const result = insertSnapshot.run({ capturedAt });
    const snapshotId = Number(result.lastInsertRowid);

    for (const position of ranked) {
      insertItem.run({
        snapshotId,
        ...position
      });
    }

    return snapshotId;
  });

  return insertSnapshotTransaction();
}

export function getLatestPositionRankChanges() {
  const db = getDb();
  const snapshots = db
    .prepare(
      `
        SELECT id
        FROM position_rank_snapshots
        ORDER BY id DESC
        LIMIT 2
      `
    )
    .all() as SnapshotRow[];

  if (snapshots.length < 2) {
    return new Map<string, number>();
  }

  const [currentSnapshot, previousSnapshot] = snapshots;
  const items = db
    .prepare(
      `
        SELECT symbol, rank
        FROM position_rank_snapshot_items
        WHERE snapshot_id = @snapshotId
      `
    );
  const currentItems = items.all({ snapshotId: currentSnapshot.id }) as SnapshotItemRow[];
  const previousItems = items.all({ snapshotId: previousSnapshot.id }) as SnapshotItemRow[];
  const previousRanks = new Map(previousItems.map((item) => [item.symbol, item.rank]));
  const rankChanges = new Map<string, number>();

  for (const item of currentItems) {
    const previousRank = previousRanks.get(item.symbol);

    if (previousRank === undefined) {
      continue;
    }

    const rankChange = previousRank - item.rank;

    if (rankChange !== 0) {
      rankChanges.set(item.symbol, rankChange);
    }
  }

  return rankChanges;
}
