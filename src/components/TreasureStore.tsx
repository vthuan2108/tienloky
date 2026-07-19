/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CultivationState, StoreItem } from '../types';
import { STORE_ITEMS } from '../data';
import { ShoppingBag, Package, Gem, Shield } from 'lucide-react';

interface TreasureStoreProps {
  state: CultivationState;
  onBuyItem: (item: StoreItem) => void;
  onUseConsumable: (itemId: string) => void;
}

export default function TreasureStore({ state, onBuyItem, onUseConsumable }: TreasureStoreProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="treasure-store">
      {/* Left 2 Columns: Items for Sale */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-[#0f141c] border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Tàng Bảo Các (Spiritual Shop)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STORE_ITEMS.map(item => {
              const canAfford = state.linhThach >= item.cost;
              return (
                <div
                  key={item.id}
                  className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl hover:border-slate-800 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.icon}</span>
                        <h4 className="text-xs font-bold text-slate-200">{item.name}</h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-500 bg-amber-950/20 border border-amber-900 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <Gem className="w-3 h-3 text-amber-500" />
                        {item.cost}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{item.description}</p>
                  </div>

                  <button
                    onClick={() => onBuyItem(item)}
                    disabled={!canAfford}
                    className={`w-full text-center py-1.5 rounded-lg text-[10px] font-bold mt-4 tracking-wider transition-all cursor-pointer ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-slate-950'
                        : 'bg-slate-900 text-slate-600 border border-slate-950 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'MUA BẰNG LINH THẠCH' : 'CHƯA ĐỦ LINH THẠCH'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Inventory & Stats */}
      <div className="space-y-4">
        <div className="bg-[#0f141c] border border-slate-800/80 rounded-2xl p-5 shadow-xl h-full flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Hành Trang Nhân Vật</h3>
          </div>

          {/* Active Shield Indicator */}
          {state.shieldActive && (
            <div className="bg-indigo-950/20 border border-indigo-900/60 p-3 rounded-xl mb-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-indigo-400 animate-pulse shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-indigo-300">HỘ TÂM KÍNH ĐANG KÍCH HOẠT</p>
                <p className="text-[9px] text-slate-500">Đạo tâm được bảo vệ vững vàng trong lần đột phá tiếp theo!</p>
              </div>
            </div>
          )}

          {/* Inventory Items list */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
            {state.inventory.length > 0 ? (
              state.inventory.map(inv => {
                const storeItem = STORE_ITEMS.find(s => s.id === inv.itemId);
                if (!storeItem) return null;

                return (
                  <div
                    key={inv.itemId}
                    className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl">{storeItem.icon}</span>
                        <h4 className="text-xs font-bold text-slate-200 truncate">
                          {storeItem.name}
                        </h4>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-1">Số lượng: <strong className="text-slate-300 font-mono">{inv.quantity}</strong></p>
                    </div>

                    <button
                      onClick={() => onUseConsumable(inv.itemId)}
                      className="bg-slate-900 hover:bg-slate-950 border border-slate-800 text-slate-300 hover:text-emerald-400 font-bold text-[9px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      SỬ DỤNG
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-24 text-slate-600 text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800 rounded-xl h-full">
                <Package className="w-6 h-6 text-slate-700 animate-pulse" />
                <span>Hành trang trống rỗng. Hãy ghé Tàng Bảo Các mua đan dược bổ trợ!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
