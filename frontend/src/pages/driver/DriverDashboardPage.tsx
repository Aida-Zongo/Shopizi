import { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import api, { getApiError } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { getSocket } from "../../lib/socket";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  Route,
  MessageCircle,
} from "lucide-react";

interface LiveOrder {
  order_id: string;
  product_name: string;
  shop_name?: string | null;
  shop_city?: string | null;
  shop_address?: string | null;
  customer_name?: string | null;
  customer_city?: string | null;
  delivery_address: string | null;
  driver_amount: number;
  distance_km?: number | null;
  estimated_minutes?: number | null;
  note?: string | null;
}

interface MyLiveOrder extends LiveOrder {
  status: "accepted" | "pickup" | "picked_up";
  customer_user_id?: string | null;
}

const DRIVER_STATUS_FLOW: Record<MyLiveOrder["status"], { next: "pickup" | "picked_up" | "delivered"; label: string }> = {
  accepted: { next: "pickup", label: "En route vers boutique" },
  pickup: { next: "picked_up", label: "Produit récupéré" },
  picked_up: { next: "delivered", label: "Livré au client" },
};

interface DriverStats {
  total_earnings: number;
  total_deliveries: number;
  rating: number;
  balance: number;
  today: {
    earnings: number;
    deliveries: number;
    distance: number;
  };
}

interface AvailableOrder {
  id: string;
  order_id: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  customer_name: string;
  customer_phone: string;
  created_at: string;
  distance_km?: number;
  estimated_price?: number;
}

interface HistoryItem {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  driver_earnings_xof?: number;
  distance_km?: number;
}

export default function DriverDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DriverStats>({
    total_earnings: 0,
    total_deliveries: 0,
    rating: 0,
    balance: 0,
    today: { earnings: 0, deliveries: 0, distance: 0 },
  });
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [incomingOrders, setIncomingOrders] = useState<LiveOrder[]>([]);
  const [myLiveOrders, setMyLiveOrders] = useState<MyLiveOrder[]>([]);
  const [acceptingLiveId, setAcceptingLiveId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (user?.driver_id) socket.emit("driver:join", user.driver_id);
    const handleNewOrder = (payload: LiveOrder) => {
      setIncomingOrders((prev) => [payload, ...prev]);
    };
    socket.on("new:order", handleNewOrder);
    return () => {
      socket.off("new:order", handleNewOrder);
    };
  }, [user?.driver_id]);

  const handleAcceptLive = async (orderId: string) => {
    setAcceptingLiveId(orderId);
    try {
      const res = await api.put(`/orders/${orderId}/accept`);
      if (res.data.success) {
        const accepted = incomingOrders.find((o) => o.order_id === orderId);
        setIncomingOrders((prev) => prev.filter((o) => o.order_id !== orderId));
        if (accepted) {
          setMyLiveOrders((prev) => [
            { ...accepted, status: "accepted", customer_user_id: res.data.data.customer_user_id },
            ...prev,
          ]);
        }
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setAcceptingLiveId(null);
    }
  };

  const handleIgnoreLive = (orderId: string) => {
    setIncomingOrders((prev) => prev.filter((o) => o.order_id !== orderId));
  };

  const handleContactCustomer = async (order: MyLiveOrder) => {
    if (!order.customer_user_id) return;
    setContactingId(order.order_id);
    try {
      const res = await api.post("/chat/rooms", {
        type: "driver_customer",
        other_user_id: order.customer_user_id,
        title: `Livraison — ${order.product_name}`,
      });
      if (res.data.success) navigate(`/driver/chat?room=${res.data.data.id}`);
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setContactingId(null);
    }
  };

  const handleDriverStatus = async (orderId: string, nextStatus: "pickup" | "picked_up" | "delivered") => {
    setUpdatingStatusId(orderId);
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      if (res.data.success) {
        if (nextStatus === "delivered") {
          setMyLiveOrders((prev) => prev.filter((o) => o.order_id !== orderId));
          fetchData();
        } else {
          setMyLiveOrders((prev) => prev.map((o) => (o.order_id === orderId ? { ...o, status: nextStatus } : o)));
        }
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleToggleOnline = async () => {
    setTogglingOnline(true);
    try {
      const next = !isOnline;
      const res = await api.put("/drivers/status", { is_online: next });
      if (res.data.success) setIsOnline(next);
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setTogglingOnline(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [statsRes, availableRes, historyRes, activeRes] = await Promise.all([
        api.get("/drivers/me/stats"),
        api.get("/delivery/available"),
        api.get("/delivery/my/history"),
        api.get("/orders/driver/active").catch(() => null),
      ]);
      if (statsRes?.data?.success) setStats(statsRes.data.data);
      if (availableRes?.data?.success)
        setAvailableOrders(availableRes.data.data || []);
      if (historyRes?.data?.success)
        setRecentHistory((historyRes.data.data || []).slice(0, 3));
      if (activeRes?.data?.success) {
        // Rehydrate in-progress deliveries after a reload; DB has no
        // 'accepted' status (accept only sets driver_id), so anything
        // before pickup maps back to the UI step "accepted".
        setMyLiveOrders(
          (activeRes.data.data || []).map((o: any): MyLiveOrder => ({
            ...o,
            product_name: o.product_name || "Commande",
            status: o.status === "pickup" || o.status === "picked_up" ? o.status : "accepted",
          }))
        );
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccept = async (orderId: string) => {
    setAcceptingId(orderId);
    try {
      const res = await api.post(`/delivery/${orderId}/claim`, {
        driver_id: user?.driver_id,
      });
      if (res.data.success) {
        setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
        fetchData();
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setAcceptingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 text-burkina-green-deep animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="bg-error-container border border-error/20 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-error mx-auto mb-2" />
          <h3 className="text-headline-sm font-headline-sm text-error mb-2">
            Erreur
          </h3>
          <p className="text-body-sm text-text-muted">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-lg text-label-md font-label-md hover:shadow-md active:scale-95 transition-all"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-lg p-4 md:p-lg max-w-7xl mx-auto">
      {/* Commission Info */}
      <div className="bg-burkina-green-light/30 border border-burkina-green-deep/20 rounded-xl p-4">
        <p className="text-body-sm font-medium text-burkina-green-deep">Vous recevez 95% des frais de livraison</p>
        <p className="text-body-sm text-text-muted">Exemple : livraison 1,000 FCFA → vous gagnez 950 FCFA</p>
      </div>

      {/* Online/Offline toggle */}
      <div className="flex items-center justify-between bg-surface-container-lowest p-md rounded-xl shadow-sm border border-outline-variant/10">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-burkina-green-deep" : "bg-outline"}`} />
          <p className="text-label-lg font-label-lg">{isOnline ? "En ligne" : "Hors ligne"}</p>
        </div>
        <button
          onClick={handleToggleOnline}
          disabled={togglingOnline}
          className={`px-4 py-2 rounded-lg text-label-md font-label-md active:scale-95 transition-all disabled:opacity-50 ${
            isOnline ? "bg-error-container text-error" : "bg-burkina-green-deep text-white"
          }`}
        >
          {togglingOnline ? "..." : isOnline ? "Passer hors ligne" : "Passer en ligne"}
        </button>
      </div>

      {/* Live orders received via Socket.io */}
      {(incomingOrders.length > 0 || myLiveOrders.length > 0) && (
        <div className="space-y-md">
          {incomingOrders.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm">
              <div className="p-md border-b border-outline-variant/10">
                <h3 className="text-headline-sm font-headline-sm">Nouvelles commandes en temps réel</h3>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {incomingOrders.map((order) => (
                  <div key={order.order_id} className="p-md flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-text-main">{order.product_name}</p>
                      {order.note && (
                        <p className="text-body-sm text-error">{order.note}</p>
                      )}
                      <p className="text-body-sm text-text-muted">
                        Collecte chez : <span className="text-text-main font-medium">{order.shop_name || "Boutique"}</span>
                        {order.shop_city ? ` (${order.shop_city})` : ""}
                        {order.shop_address ? ` — ${order.shop_address}` : ""}
                      </p>
                      <p className="text-body-sm text-text-muted">
                        Livraison à : <span className="text-text-main font-medium">{order.customer_name || "Client"}</span>
                        {order.customer_city ? ` (${order.customer_city})` : ""}
                        {order.delivery_address ? ` — ${order.delivery_address}` : ""}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-label-sm text-burkina-green-deep font-bold">Vos gains : +{order.driver_amount.toLocaleString()} FCFA</p>
                        {order.distance_km != null && (
                          <span className="text-[11px] text-text-muted">· Distance : {Number(order.distance_km).toFixed(1)} km</span>
                        )}
                        {order.estimated_minutes != null && (
                          <span className="text-[11px] text-text-muted">· Durée estimée : ~{order.estimated_minutes} min</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleIgnoreLive(order.order_id)}
                        className="px-3 py-2 text-text-muted hover:text-error rounded-lg text-label-md font-label-md active:scale-95"
                      >
                        Ignorer
                      </button>
                      <button
                        onClick={() => handleAcceptLive(order.order_id)}
                        disabled={acceptingLiveId === order.order_id}
                        className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg text-label-md font-label-md active:scale-95 disabled:opacity-50"
                      >
                        {acceptingLiveId === order.order_id ? "..." : "Accepter"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myLiveOrders.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm">
              <div className="p-md border-b border-outline-variant/10">
                <h3 className="text-headline-sm font-headline-sm">Mes livraisons en cours</h3>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {myLiveOrders.map((order) => (
                  <div key={order.order_id} className="p-md flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-text-main">{order.product_name}</p>
                      <p className="text-body-sm text-text-muted">
                        Collecte chez : <span className="text-text-main font-medium">{order.shop_name || "Boutique"}</span>
                        {order.shop_city ? ` (${order.shop_city})` : ""}
                        {order.shop_address ? ` — ${order.shop_address}` : ""}
                      </p>
                      <p className="text-body-sm text-text-muted">
                        Livraison à : <span className="text-text-main font-medium">{order.customer_name || "Client"}</span>
                        {order.customer_city ? ` (${order.customer_city})` : ""}
                        {order.delivery_address ? ` — ${order.delivery_address}` : ""}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-label-sm text-burkina-green-deep font-bold">Vos gains : +{order.driver_amount.toLocaleString()} FCFA</p>
                        {order.distance_km != null && (
                          <span className="text-[11px] text-text-muted">· {Number(order.distance_km).toFixed(1)} km</span>
                        )}
                        {order.estimated_minutes != null && (
                          <span className="text-[11px] text-text-muted">· ~{order.estimated_minutes} min</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {order.customer_user_id && (
                        <button
                          onClick={() => handleContactCustomer(order)}
                          disabled={contactingId === order.order_id}
                          title="Contacter le client"
                          className="p-2.5 rounded-lg border border-outline-variant/30 text-text-muted hover:text-burkina-green-deep hover:border-burkina-green-deep transition-all active:scale-95 disabled:opacity-50"
                        >
                          {contactingId === order.order_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MessageCircle className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDriverStatus(order.order_id, DRIVER_STATUS_FLOW[order.status].next)}
                        disabled={updatingStatusId === order.order_id}
                        className="px-4 py-2 bg-burkina-green-deep text-white rounded-lg text-label-md font-label-md active:scale-95 disabled:opacity-50"
                      >
                        {updatingStatusId === order.order_id ? "..." : DRIVER_STATUS_FLOW[order.status].label}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Hero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        <div className="md:col-span-2 bg-surface-container-lowest p-md rounded-xl shadow-sm border-l-4 border-burkina-green-deep relative overflow-hidden flex flex-col justify-center">
          <p className="text-label-lg font-label-lg text-text-muted mb-1">
            Gains Totaux d'Aujourdhui
          </p>
          <h2 className="text-headline-lg font-headline-lg text-burkina-green-deep">
            {stats.today.earnings.toLocaleString()} FCFA
          </h2>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-burkina-green-deep bg-burkina-green-light px-2 py-0.5 rounded text-label-sm font-bold">
              {stats.today.deliveries} courses
            </span>
            <span className="text-label-sm text-text-muted">ce jour</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-md rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Route className="w-5 h-5 text-secondary" />
            <p className="text-label-lg font-label-lg text-text-muted">
              Distance parcourue
            </p>
          </div>
          <h3 className="text-headline-md font-headline-md">
            {stats.today.distance} km
          </h3>
        </div>
        <div className="bg-surface-container-lowest p-md rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-burkina-green-deep" />
            <p className="text-label-lg font-label-lg text-text-muted">
              Note moyenne
            </p>
          </div>
          <h3 className="text-headline-md font-headline-md">
            {stats.rating > 0 ? `${stats.rating.toFixed(1)} / 5` : '—'}
          </h3>
        </div>
      </div>

      {/* Available Orders & Weekly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2 space-y-md">
          <div className="flex items-center justify-between">
            <h3 className="text-headline-sm font-headline-sm flex items-center gap-2">
              Commandes à proximité
              <span className="bg-secondary-container text-on-secondary-container text-[12px] px-2 py-0.5 rounded-full">
                {availableOrders.length} disponibles
              </span>
            </h3>
          </div>
          {availableOrders.length === 0 && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-8 text-center shadow-sm">
              <p className="text-text-muted text-body-md">
                Aucune commande disponible pour le moment.
              </p>
            </div>
          )}
          {availableOrders.map((order) => (
            <div
              key={order.id}
              className="bg-surface-container-lowest rounded-xl shadow-sm p-md hover:shadow-md transition-all border border-outline-variant/10"
            >
              <div className="flex flex-col md:flex-row gap-md">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-headline-sm font-headline-sm">
                        Commande #{order.order_id?.slice(0, 8)}
                      </h4>
                      <p className="text-body-sm text-text-muted">
                        {order.customer_name}
                      </p>
                    </div>
                  </div>
                  <div className="relative flex flex-col gap-4 pl-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/30">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute -left-10 text-burkina-green-deep bg-burkina-green-light p-1 rounded-full text-[18px]">
                        storefront
                      </span>
                      <p className="text-label-lg font-label-lg">Ramassage</p>
                      <p className="text-body-sm text-text-muted">
                        {order.pickup_address}
                      </p>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute -left-10 text-secondary bg-saffron-glow p-1 rounded-full text-[18px]">
                        person_pin_circle
                      </span>
                      <p className="text-label-lg font-label-lg">
                        Livraison
                      </p>
                      <p className="text-body-sm text-text-muted">
                        {order.delivery_address}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-64 h-48 md:h-auto rounded-lg overflow-hidden relative border border-outline-variant/20 bg-surface-container-low flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-burkina-green-deep text-[32px] animate-bounce">
                    location_on
                  </span>
                  <p className="text-[10px] uppercase tracking-wider font-bold mt-2">
                    Aperçu Carte
                  </p>
                  <button
                    onClick={() => handleAccept(order.id)}
                    disabled={acceptingId === order.id}
                    className="absolute bottom-4 left-4 right-4 w-[calc(100%-32px)] bg-secondary-container hover:bg-secondary text-on-secondary-container font-label-lg py-3 rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {acceptingId === order.id
                      ? "Validation..."
                      : "Valider la livraison"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right sidebar */}
        <div className="space-y-lg">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/20">
            <div className="p-md bg-burkina-green-light border-b border-burkina-green-deep/10">
              <h3 className="text-label-lg font-bold text-burkina-green-deep">
                Résumé Hebdomadaire
              </h3>
            </div>
            <div className="p-md space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[11px] text-text-muted uppercase">
                    Total gains
                  </p>
                  <p className="text-headline-sm font-headline-sm">
                    {stats.total_earnings.toLocaleString()} FCFA
                  </p>
                </div>
                <p className="text-label-sm font-bold text-burkina-green-deep">
                  {stats.total_deliveries} livraisons
                </p>
              </div>
              <div className="pt-4 border-t border-outline-variant/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-body-sm text-text-muted">
                    Solde actuel
                  </span>
                  <span className="text-label-lg font-bold text-secondary">
                    {stats.balance.toLocaleString()} F
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-text-muted">
                    Note moyenne
                  </span>
                  <span className="text-label-lg font-bold">
                    {stats.rating > 0 ? `${stats.rating.toFixed(1)} / 5` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
            <div className="p-md flex justify-between items-center border-b border-outline-variant/10">
              <h3 className="text-label-lg font-bold">Historique Récent</h3>
              <Link
                to="/history"
                className="text-[12px] text-burkina-green-deep hover:underline"
              >
                Tout voir
              </Link>
            </div>
            <div className="p-0">
              {recentHistory.length === 0 && (
                <div className="p-6 text-center text-text-muted text-body-sm">
                  Aucun historique récent.
                </div>
              )}
              {recentHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-md border-b border-outline-variant/10 flex items-center gap-3 last:border-b-0"
                >
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                      item.status === "delivered"
                        ? "bg-burkina-green-light"
                        : "bg-error-container/20"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        color:
                          item.status === "delivered"
                            ? "#00A86B"
                            : "#ba1a1a",
                      }}
                    >
                      {item.status === "delivered" ? "check_circle" : "cancel"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-label-md font-bold leading-tight">
                      #{item.order_number?.slice(0, 8)}
                    </p>
                    <p className="text-[12px] text-text-muted">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p
                    className={`text-label-lg font-bold ${
                      item.driver_earnings_xof && item.driver_earnings_xof > 0
                        ? "text-text-main"
                        : "text-text-muted"
                    }`}
                  >
                    {item.driver_earnings_xof
                      ? `+${item.driver_earnings_xof.toLocaleString()} F`
                      : "0 F"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
