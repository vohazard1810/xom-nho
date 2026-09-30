// DATA_SCHEMA.ts — Xóm Nhỏ v0.7 Data Models & Type Contracts
// Updated: 2026-09-30 (v0.7.3)
// Strict JSON-serializable schema: Zero functions in state, complete cost-basis inventory tracking,
// unified cash reconciliation (no double-subtraction), 1 pause decision + non-pausing news ticker.
//
// Owner annotations:
//   [P] = Persistent across days (saved to storage)
//   [D] = Day-scoped (reset/re-calculated each day)
//   [T] = Transient / UI-only (never persisted)

// ═══════════════════════════════════════════════════════════════════════
// 1. TOP-LEVEL PERSISTENT GAME STATE
// ═══════════════════════════════════════════════════════════════════════

export interface GameState {
  saveRevision: number;                 // [P] Monotonic counter for save slot integrity
  currentDay: number;                   // [P] 1-indexed (Day 1, Day 2...)
  
  // Economy accounts
  cashInDrawer: number;                 // [P] Actual physical cash in drawer (VND integer)
  totalHistoricalRevenue: number;       // [P] Cumulative revenue across all days
  totalHistoricalCOGS: number;          // [P] Cumulative COGS across all days
  outstandingReceivables: number;       // [P] Unpaid customer tabs / ghi sổ
  
  // Progression & Reputation
  reputation: ShopReputation;           // [P] Rating & neighborhood knowledge
  upgrades: ShopUpgrades;               // [P] Vehicle, counter, seating upgrades
  
  // Knowledge & NPC Memory
  knownRecipeIds: string[];             // [P] Recipes unlocked and successfully prepared
  teasedRecipeIds: string[];            // [P] Recipes teased in stories (e.g. BANH_MI_TRUNG)
  npcFacts: Record<string, NPCFactSheet>; // [P] Factual memory keyed by personId
  
  // Storage carry-over with exact Cost Basis
  pantryInventory: Record<string, PantryStockLine>; // [P] Carried overnight with cost basis
  
  // Active Day Simulation (null if player is on Day Transition screen)
  activeDay: DayState | null;           // [D] Current active day data
}

// ═══════════════════════════════════════════════════════════════════════
// 2. DAY STATE (Single Day Scope)
// ═══════════════════════════════════════════════════════════════════════

export interface DayState {
  dayNumber: number;                    // [D] Matching currentDay
  phase: 'PREPARE' | 'SERVICE' | 'WRAP_UP'; // [D] Day lifecycle phase
  
  // ── PREPARE Decisions ──
  chosenOpeningTime: 'EARLY_6AM' | 'ON_TIME_8AM' | 'LATE_10AM'; // [D]
  dailyMenu: Record<string, DailyMenuItem>;                    // [D] Keyed by recipeId (3 starter slots)
  purchasesToday: Record<string, BatchPurchase>;               // [D] Keyed by ingredientId
  
  // ── SERVICE Simulation ──
  clock: SimulationClock;               // [D] Fast-forward simulation clock
  incomingQueue: ScheduledCustomer[];   // [D] Today's arrival roster (8 fixture customers)
  activeCustomerSlots: (ActiveCustomer | null)[]; // [D] Customers visible at counter (max 3)
  completedOrders: FulfilledOrder[];    // [D] Successfully served orders
  missedOrders: AbandonedOrder[];       // [D] Lost orders (out of stock, walk-outs)
  livePantry: Record<string, PantryStockLine>; // [D] Live inventory with cost basis during service
  
  // Single active pause decision (only for true choices like Bé Tí extra chả)
  activeDecision: PendingDecision | null; // [D] If non-null, CLOCK IS PAUSED
  
  // Ambient news banners (does NOT pause clock)
  activeNewsTicker: MarketNewsTicker | null; // [D] Non-blocking market chatter
  
  // ── WRAP_UP Accounting ──
  dayLedger: TransparentLedger | null;  // [D] Reconciled at end of day
}

// ═══════════════════════════════════════════════════════════════════════
// 3. INVENTORY & COST BASIS TRACKING
// ═══════════════════════════════════════════════════════════════════════

export interface PantryStockLine {
  ingredientId: string;
  totalQuantity: number;                // Total units in pantry
  averageUnitCost: number;              // Weighted cost basis (VND)
  batches: StockBatchEntry[];           // Individual purchase batches for exact COGS
}

export interface StockBatchEntry {
  batchId: string;                      // e.g. 'batch_day1_morning'
  dayAcquired: number;
  unitCost: number;                     // Exact price paid when purchased
  quantityRemaining: number;            // Decrements as items are consumed
}

export interface BatchPurchase {
  ingredientId: string;
  quantityPurchased: number;
  unitCostAtPurchase: number;           // Actual price paid at morning market
  totalCostPaid: number;                // quantityPurchased × unitCostAtPurchase
}

// ═══════════════════════════════════════════════════════════════════════
// 4. MENU & PRICING (3 Starter Slots, Upgradeable to 4+)
// ═══════════════════════════════════════════════════════════════════════

export interface DailyMenuItem {
  recipeId: string;                     // e.g. 'BANH_MI_CHA', 'TRA_TAC', 'SUA_DAU_DA'
  isEnabled: boolean;                   // Placed on today's chalkboard
  activeSellPrice: number;              // Player-chosen price from available tiers
  costPerServingEstimate: number;       // Computed: sum of ingredient costs at purchase price
  expectedMarginPerServing: number;     // activeSellPrice - costPerServingEstimate
  isTemporarilySuspended?: boolean;     // Can be paused mid-day if supply shocks occur
}

// ═══════════════════════════════════════════════════════════════════════
// 5. CUSTOMERS & EMOTIONS
// ═══════════════════════════════════════════════════════════════════════

export type EmotionState = 'normal' | 'happy' | 'impatient';

export interface ScheduledCustomer {
  ticketId: string;                     // Unique arrival ticket
  personId: string;                     // Stable identity (e.g. 'be_ti', 'co_chin', 'anh_tung', or 'walkin_01')
  displayName: string;                  // Display name
  visualVariantId: string;              // Sprite / accessory variant identifier
  isStoryRegular: boolean;              // true = named NPC with persistent narrative
  
  desiredRecipeId: string;
  arrivalTimeMinutes: number;           // In-game minutes from day start
  basePatienceSeconds: number;          // How long they wait before turning impatient
  priceSensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  
  specialRequestType?: 'EXTRA_CHA' | 'RUSH_ORDER';
}

export interface ActiveCustomer {
  ticket: ScheduledCustomer;
  currentEmotion: EmotionState;
  state: 'APPROACHING' | 'WAITING_AUTO_PREP' | 'RECEIVING' | 'LEAVING';
  prepProgressPercent: number;          // 0 to 100% for auto-service visual bar
  dialogueSnippet: string;
}

// ═══════════════════════════════════════════════════════════════════════
// 6. NPC FACT SHEET (Fact-Based Memory, No Abstract Scores)
// ═══════════════════════════════════════════════════════════════════════

export interface NPCFactSheet {
  personId: string;
  successfulOrdersCount: number;
  missedOrdersCount: number;
  lastVisitDay: number;
  lastMissedDay: number | null;
  timesGivenExtra: number;
  timesPrioritized: number;
  unpaidTabBalance: number;             // Ghi sổ
  debtRepaidHistory: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// 7. SIMULATION CLOCK, DECISIONS (PAUSE) & NEWS (NO PAUSE)
// ═══════════════════════════════════════════════════════════════════════

export interface SimulationClock {
  currentMinute: number;                // e.g. 480 = 8:00 AM, 720 = 12:00 PM
  endOfDayMinute: number;               // e.g. 840 = 2:00 PM
  speedMultiplier: 1 | 2;               // x1 or x2 fast-forward
  isPaused: boolean;                    // MUST BE TRUE whenever activeDecision !== null
  timeSlotName: 'SÁNG SỚM' | 'GIỜ ĐI HỌC / ĐI LÀM' | 'TRƯA' | 'CHIỀU';
}

/** Strictly JSON-serializable decision state (Only for genuine choices, pauses clock) */
export interface PendingDecision {
  decisionId: string;                   // e.g. 'BETI_EXTRA_CHA_REQUEST'
  title: string;
  description: string;
  speakerName?: string;
  options: DecisionOptionData[];
}

export interface DecisionOptionData {
  optionKey: string;                   // e.g. 'GRANT_EXTRA', 'DENY_EXTRA'
  buttonLabel: string;
  narrativeConsequence: string;
  actionKey: string;                   // Pure string ID processed by engine reducer
  actionPayload?: Record<string, string | number | boolean>; // Pure JSON parameters
}

/** Ambient news notification (Does NOT pause clock) */
export interface MarketNewsTicker {
  newsId: string;                       // e.g. 'KUMQUAT_CHIEU_SPIKE_RUMOR'
  headline: string;                     // Short banner text: "Bà Sáu: Tắc chợ chiều bị gom giá lên 3k!"
  displayDurationSeconds: number;       // How long banner floats before disappearing
  dayTwoImpactHint: string;             // Stored for journal hint at wrap-up
}

// ═══════════════════════════════════════════════════════════════════════
// 8. REPUTATION & UPGRADES
// ═══════════════════════════════════════════════════════════════════════

export interface ShopReputation {
  ratingStatus: 'UNRATED_NEW_SHOP' | 'CALIBRATED';
  currentStarDisplay: string;           // "Chưa đủ đánh giá" during Day 1
  firstDayReviewSummary: string | null; // Generated at end of Day 1 based on actual service facts
}

export interface ShopUpgrades {
  vehicleCapacityUnits: number;         // 20 units (Xe đạp chở hàng) initially
  counterDisplaySlots: number;          // 3 slots initially (bán đủ 3 món khởi đầu; nâng cấp mở slot thứ 4)
  seatingStools: number;                // 2 plastic stools initially
  previewedNextUpgrade: string | null;  // Preview only for Day 2 plan, no money deducted Day 1
}

// ═══════════════════════════════════════════════════════════════════════
// 9. ORDERS & RECONCILED ACCOUNTING LEDGER (Strict Standard Formula)
// ═══════════════════════════════════════════════════════════════════════

export interface FulfilledOrder {
  ticketId: string;
  personId: string;
  recipeId: string;
  billedRevenue: number;                // Actual price charged to customer
  isPaidCash: boolean;                  // true = paid cash immediately; false = ghi sổ
  actualCOGS: number;                   // Cost of exact ingredients consumed from batch entries
  ingredientsDeducted: Record<string, number>;
  tipEarned: number;
  timestampMinute: number;
}

export interface AbandonedOrder {
  ticketId: string;
  personId: string;
  recipeId: string;
  reason: 'OUT_OF_STOCK' | 'LEFT_IMPATIENT' | 'PRICE_REJECTED';
  timestampMinute: number;
}

export interface TransparentLedger {
  // ── Cash Flow in Drawer (Cash Inflows - Cash Outflows) ──
  startingCash: number;                 // Cash in drawer at 6:00 AM (60.000đ)
  spentOnMorningStock: number;          // Cash Outflow at Morning Market (-55.000đ)
  cashSalesCollected: number;           // Actual Cash Inflow collected from cash-paying customers (+122.000đ)
  tipsCollected: number;                // Tips Inflow (+0đ)
  
  // Standard Cash Formula:
  // finalCashInDrawer = startingCash - spentOnMorningStock + cashSalesCollected + tipsCollected
  // NOTE: uncollectedCreditSales is NOT subtracted here because cashSalesCollected ONLY counts actual cash received!
  finalCashInDrawer: number;            // 60k - 55k + 122k + 0k = 127.000đ
  netCashDifferenceToday: number;       // finalCashInDrawer - startingCash (+67.000đ)

  // ── Accrual Accounts & Receivables ──
  totalSalesRevenue: number;            // Total Billed Revenue = cashSalesCollected + uncollectedCreditSales (122.000đ)
  uncollectedCreditSales: number;       // Unpaid tabs / Ghi sổ (0đ for Day 1)

  // ── P&L Accounting (Standard Terminology: Gross Operating Profit) ──
  cogsSoldItemsOnly: number;            // Exact purchase cost of ingredients in fulfilled orders (55.000đ)
  grossOperatingProfit: number;         // totalSalesRevenue - cogsSoldItemsOnly (+67.000đ)

  // ── Inventory Reconciliation (Pantry stock does not inflate COGS) ──
  retainedStockQuantity: Record<string, number>;
  retainedStockValueAtCost: number;     // Value of unsold items sitting in pantry (0đ)
  spoilageLoss: number;                 // Separate line item, never mixed into COGS (0đ)
  operatingExpenses: number;            // Tiền thuê/điện nước nếu có (0đ for Day 1)

  // Breakdown by Dish
  dishBreakdown: Record<string, {
    servingsSold: number;
    subtotalRevenue: number;
    subtotalCOGS: number;
    subtotalMargin: number;             // subtotalRevenue - subtotalCOGS
  }>;

  // Unserved Summary
  unservedCount: number;
  unservedLog: AbandonedOrder[];

  // Narrative Feedback & Day 2 Hook
  customerFeedbackStories: string[];
  dayTwoPreviewOpportunity: string;
}
