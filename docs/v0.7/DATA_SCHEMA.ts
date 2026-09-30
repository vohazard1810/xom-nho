// DATA_SCHEMA.ts — Xóm Nhỏ v0.7 Data Models & Type Contracts
// Updated: 2026-09-30 — Incorporating Owner Decisions 1–5
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
  cashInDrawer: number;                 // [P] Actual cash in hand (VND integer)
  totalHistoricalRevenue: number;       // [P] Cumulative revenue across days
  totalHistoricalCOGS: number;          // [P] Cumulative COGS across days
  outstandingReceivables: number;       // [P] Ghi sổ / debts owed to the shop
  
  // Progression & Reputation
  reputation: ShopReputation;           // [P] Rating & neighborhood knowledge
  upgrades: ShopUpgrades;               // [P] Vehicle, counter, seating upgrades
  
  // Knowledge & NPC Memory
  knownRecipeIds: string[];             // [P] Recipes unlocked and successfully prepared
  teasedRecipeIds: string[];            // [P] Recipes teased in stories (e.g. BANH_MI_TRUNG)
  npcFacts: Record<string, NPCFactSheet>; // [P] Factual memory keyed by personId
  
  // Storage carry-over
  pantryInventory: Record<string, number>; // [P] Quantity of ingredients carried overnight
  
  // Active Day Simulation (null if player is on Day Transition)
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
  dailyMenu: Record<string, DailyMenuItem>;                    // [D] Keyed by recipeId
  purchasesToday: Record<string, BatchPurchase>;               // [D] Keyed by ingredientId
  
  // ── SERVICE Simulation ──
  clock: SimulationClock;               // [D] Fast-forward simulation clock
  incomingQueue: ScheduledCustomer[];   // [D] Today's arrival roster (8 fixture customers)
  activeCustomerSlots: (ActiveCustomer | null)[]; // [D] Customers visible at counter (max 3)
  completedOrders: FulfilledOrder[];    // [D] Successfully served orders
  missedOrders: AbandonedOrder[];       // [D] Lost orders (out of stock, walk-outs)
  livePantry: Record<string, number>;   // [D] Live inventory counts during service
  activeDecision: PendingDecision | null; // [D] If non-null, CLOCK IS PAUSED
  
  // ── WRAP_UP Accounting ──
  dayLedger: TransparentLedger | null;  // [D] Reconciled at end of day
}

// ═══════════════════════════════════════════════════════════════════════
// 3. MENU & PRICING (Owner Decision 2 & 3)
// ═══════════════════════════════════════════════════════════════════════

export interface DailyMenuItem {
  recipeId: string;                     // e.g. 'BANH_MI_CHA', 'TRA_TAC', 'SUA_DAU_DA'
  isEnabled: boolean;                   // Placed on today's chalkboard
  activeSellPrice: number;              // Player-chosen price from available tiers
  costPerServingEstimate: number;       // Computed: sum of ingredient costs at purchase price
  expectedMarginPerServing: number;     // activeSellPrice - costPerServingEstimate
  isTemporarilySuspended?: boolean;     // Can be paused mid-day if supply shocks occur
}

export interface BatchPurchase {
  ingredientId: string;
  quantityPurchased: number;
  unitCostAtPurchase: number;           // Actual price paid at morning market
  totalCostPaid: number;                // quantityPurchased × unitCostAtPurchase
}

// ═══════════════════════════════════════════════════════════════════════
// 4. CUSTOMERS & EMOTIONS (Owner Decision 1)
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
// 5. NPC FACT SHEET (Fact-Based Memory, No Abstract Scores)
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
// 6. SIMULATION CLOCK & DECISIONS (Pause On Event)
// ═══════════════════════════════════════════════════════════════════════

export interface SimulationClock {
  currentMinute: number;                // e.g. 480 = 8:00 AM, 720 = 12:00 PM
  endOfDayMinute: number;               // e.g. 840 = 2:00 PM
  speedMultiplier: 1 | 2;               // x1 or x2 fast-forward
  isPaused: boolean;                    // MUST BE TRUE whenever activeDecision !== null
  timeSlotName: 'SÁNG SỚM' | 'GIỜ ĐI HỌC / ĐI LÀM' | 'TRƯA' | 'CHIỀU';
}

export interface PendingDecision {
  decisionId: string;                   // e.g. 'BETI_EXTRA_CHA_REQUEST', 'KUMQUAT_PRICE_SPIKE_MIDDAY'
  title: string;
  description: string;
  speakerName?: string;
  options: DecisionOption[];
}

export interface DecisionOption {
  optionKey: string;
  buttonLabel: string;
  narrativeConsequence: string;
  immediateEffect: (state: DayState) => void;
}

// ═══════════════════════════════════════════════════════════════════════
// 7. REPUTATION & UPGRADES (Owner Decisions 4 & 5)
// ═══════════════════════════════════════════════════════════════════════

export interface ShopReputation {
  ratingStatus: 'UNRATED_NEW_SHOP' | 'CALIBRATED';
  currentStarDisplay: string;           // "Chưa đủ đánh giá" during Day 1
  firstDayReviewSummary: string | null; // Generated at end of Day 1
}

export interface ShopUpgrades {
  vehicleCapacityUnits: number;         // 15 units (Xe đạp) initially
  counterDisplaySlots: number;          // 2 slots initially
  seatingStools: number;                // 2 plastic stools initially
  previewedNextUpgrade: string | null;  // Owner Decision 5: Preview only, no charge
}

// ═══════════════════════════════════════════════════════════════════════
// 8. ORDERS & ACCOUNTING LEDGER
// ═══════════════════════════════════════════════════════════════════════

export interface FulfilledOrder {
  ticketId: string;
  personId: string;
  recipeId: string;
  billedRevenue: number;                // Price charged to customer
  actualCOGS: number;                   // Cost of exact ingredients used based on batch unitCost
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
  // Cash Flow in Drawer
  startingCash: number;                 // Cash at 6:00 AM (e.g. 60.000đ)
  spentOnMorningStock: number;          // Outflow at Market (e.g. -28.000đ)
  cashCollectedFromSales: number;       // Inflow from fulfilled orders (e.g. +57.000đ)
  tipsCollected: number;                // Inflow from tips (e.g. 0đ)
  finalCashInDrawer: number;            // startingCash - spentOnMorningStock + cashCollectedFromSales + tipsCollected
  netCashDifferenceToday: number;       // finalCashInDrawer - startingCash

  // P&L Accounting
  totalSalesRevenue: number;            // Gross sales
  cogsSoldItemsOnly: number;            // Exact purchase cost of ingredients that were actually sold
  grossOperatingProfit: number;         // totalSalesRevenue - cogsSoldItemsOnly

  // Inventory Reconciliation (Owner Decision 3: Pantry items do not inflate COGS)
  retainedStockQuantity: Record<string, number>;
  retainedStockValueAtCost: number;     // Value of unsold items sitting in pantry
  unrecordedSpoilageLoss: number;       // 0 for Day 1

  // Breakdown by Dish
  dishBreakdown: Record<string, {
    servingsSold: number;
    subtotalRevenue: number;
    subtotalCOGS: number;
    subtotalMargin: number;
  }>;

  // Unserved Summary
  unservedCount: number;
  unservedLog: AbandonedOrder[];

  // Narrative Feedback & Day 2 Hook
  customerFeedbackStories: string[];
  dayTwoPreviewOpportunity: string;
}
