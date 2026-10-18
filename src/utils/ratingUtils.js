import { doc, getDoc, updateDoc, getDocs, collection, query, where } from "firebase/firestore";

/**
 * Tiered Report Penalty Thresholds
 * - < 10 reports: 0 deduction
 * - 10 to 29 reports: -0.5★ deduction
 * - 30 to 49 reports: -1.0★ deduction
 * - 50+ reports: -1.5★ deduction
 * Floored at 0.5★ minimum
 *
 * Approaching warning triggered at 7 to 9 reports.
 */
export const REPORT_THRESHOLDS = {
  APPROACHING: 7,
  TIER_1: 10,
  TIER_2: 30,
  TIER_3: 50,
};

export const PENALTIES = {
  TIER_0: 0.0,
  TIER_1: 0.5,
  TIER_2: 1.0,
  TIER_3: 1.5,
};

export const MIN_RATING = 0.5;

/**
 * Returns penalty details based on the active report count.
 * @param {number} reportCount - Number of active reports against the shop
 * @returns {{
 *   penalty: number,
 *   tier: number,
 *   isPenalized: boolean,
 *   isApproaching: boolean,
 *   nextThreshold: number | null,
 *   reportsUntilNext: number,
 *   warningLevel: 'none' | 'approaching' | 'tier1' | 'tier2' | 'tier3'
 * }}
 */
export function getReportPenalty(reportCount = 0) {
  const count = Math.max(0, parseInt(reportCount, 10) || 0);

  if (count >= REPORT_THRESHOLDS.TIER_3) {
    return {
      penalty: PENALTIES.TIER_3,
      tier: 3,
      isPenalized: true,
      isApproaching: false,
      nextThreshold: null,
      reportsUntilNext: 0,
      warningLevel: 'tier3'
    };
  }

  if (count >= REPORT_THRESHOLDS.TIER_2) {
    return {
      penalty: PENALTIES.TIER_2,
      tier: 2,
      isPenalized: true,
      isApproaching: false,
      nextThreshold: REPORT_THRESHOLDS.TIER_3,
      reportsUntilNext: REPORT_THRESHOLDS.TIER_3 - count,
      warningLevel: 'tier2'
    };
  }

  if (count >= REPORT_THRESHOLDS.TIER_1) {
    return {
      penalty: PENALTIES.TIER_1,
      tier: 1,
      isPenalized: true,
      isApproaching: false,
      nextThreshold: REPORT_THRESHOLDS.TIER_2,
      reportsUntilNext: REPORT_THRESHOLDS.TIER_2 - count,
      warningLevel: 'tier1'
    };
  }

  if (count >= REPORT_THRESHOLDS.APPROACHING) {
    return {
      penalty: PENALTIES.TIER_0,
      tier: 0,
      isPenalized: false,
      isApproaching: true,
      nextThreshold: REPORT_THRESHOLDS.TIER_1,
      reportsUntilNext: REPORT_THRESHOLDS.TIER_1 - count,
      warningLevel: 'approaching'
    };
  }

  return {
    penalty: PENALTIES.TIER_0,
    tier: 0,
    isPenalized: false,
    isApproaching: false,
    nextThreshold: REPORT_THRESHOLDS.TIER_1,
    reportsUntilNext: REPORT_THRESHOLDS.TIER_1 - count,
    warningLevel: 'none'
  };
}

/**
 * Calculates final shop rating after applying the tiered report penalty.
 * Rating is floored at MIN_RATING (0.5) if baseRating > 0 and penalty is applied.
 * If baseRating <= 0, returns 0.
 *
 * @param {number} baseRating - Unadjusted average rating
 * @param {number} reportCount - Number of active customer reports
 * @returns {number} Rating rounded to 1 decimal place
 */
export function calculateShopRating(baseRating = 0, reportCount = 0) {
  const base = Number(baseRating) || 0;
  if (base <= 0) return 0;

  const { penalty } = getReportPenalty(reportCount);
  if (penalty <= 0) {
    return Math.round(base * 10) / 10;
  }

  const adjusted = Math.max(MIN_RATING, base - penalty);
  return Math.round(adjusted * 10) / 10;
}

export const calculateAdjustedRating = calculateShopRating;

/**
 * Fetches the active report count for a shop from Firestore adminAlerts.
 * @param {any} db - Firestore database instance
 * @param {string} shopId - Shop document ID
 * @returns {Promise<number>}
 */
export async function getShopReportCount(db, shopId) {
  if (!db || !shopId) return 0;
  try {
    const repSnap = await getDocs(query(collection(db, "adminAlerts"), where("type", "==", "shop_report"), where("shopId", "==", shopId)));
    return repSnap.size;
  } catch (err) {
    console.error("Failed to fetch shop report count:", err);
    return 0;
  }
}

/**
 * Re-computes base rating from bookings/reviews and report penalty from adminAlerts,
 * and updates the Firestore shop document.
 *
 * @param {any} db - Firestore database instance
 * @param {string} shopId - Shop document ID
 * @returns {Promise<{ rating: number, reviews: number, reportCount: number, rawRating: number } | null>}
 */
export async function recalculateAndSyncShopRating(db, shopId) {
  if (!db || !shopId) return null;
  try {
    const shopRef = doc(db, "shops", shopId);
    const shopSnap = await getDoc(shopRef);
    if (!shopSnap.exists()) return null;
    const shopData = shopSnap.data();

    // 1. Fetch rated bookings for this shop
    const bSnap = await getDocs(query(collection(db, "bookings"), where("shopId", "==", shopId)));
    const ratedBookings = bSnap.docs
      .map(d => d.data())
      .filter(b => b.rating && !isNaN(Number(b.rating)) && Number(b.rating) > 0 && !b.reviewHidden && b.reviewStatus !== "archived");

    // 2. Fetch direct subcollection reviews if any
    let directReviews = [];
    try {
      const rSnap = await getDocs(collection(db, "shops", shopId, "reviews"));
      directReviews = rSnap.docs
        .map(d => d.data())
        .filter(r => r.rating && !isNaN(Number(r.rating)) && Number(r.rating) > 0 && !r.reviewHidden && r.status !== "archived" && r.reviewStatus !== "archived");
    } catch (e) {}

    const allReviews = [...ratedBookings, ...directReviews];
    const totalReviews = allReviews.length;

    // 3. Fetch active report count
    const repSnap = await getDocs(query(collection(db, "adminAlerts"), where("type", "==", "shop_report"), where("shopId", "==", shopId)));
    const reportCount = repSnap.size;

    // 4. Calculate raw base average
    let rawBase = 0;
    if (totalReviews > 0) {
      rawBase = allReviews.reduce((sum, r) => sum + Number(r.rating), 0) / totalReviews;
    } else if (shopData.rawRating !== undefined && Number(shopData.rawRating) > 0) {
      rawBase = Number(shopData.rawRating);
    } else if (shopData.rating !== undefined && Number(shopData.rating) > 0) {
      rawBase = Number(shopData.rating);
    }

    const finalRating = calculateShopRating(rawBase, reportCount);

    await updateDoc(shopRef, {
      rating: finalRating,
      reviews: totalReviews,
      reportCount: reportCount,
      rawRating: Math.round(rawBase * 10) / 10
    });

    return {
      rating: finalRating,
      reviews: totalReviews,
      reportCount: reportCount,
      rawRating: Math.round(rawBase * 10) / 10
    };
  } catch (err) {
    console.error("Failed to recalculate and sync shop rating:", err);
    return null;
  }
}
