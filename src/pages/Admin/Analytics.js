import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, getDocs, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
    FiTrendingUp, FiShoppingBag, FiDollarSign, FiUsers, FiRepeat, 
    FiCalendar, FiBarChart2, FiPieChart, FiMinusCircle, FiArrowUp, FiArrowDown, FiPackage,
    FiUserCheck, FiUserPlus, FiLogIn
} from 'react-icons/fi';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import './Analytics.css';

const Analytics = () => {
    const location = useLocation();
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    
    // Determine current view
    const isOverview = lastPart === 'analytics' || lastPart === 'admin';
    const isOrdersView = lastPart === 'orders';
    const isCustomersView = lastPart === 'customers';
    const isRevenueView = lastPart === 'revenue';

    const viewTitle = {
        'analytics': 'Overview',
        'orders': 'Orders Analysis',
        'customers': 'Customer Analysis',
        'revenue': 'Revenue Analysis'
    }[lastPart] || 'Overview';

    // State
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState('month'); // today, week, month, year, all
    const [chartGroup, setChartGroup] = useState('day'); // day, month
    const [filters, setFilters] = useState({
        category: '',
        product: '',
        paymentMode: '',
        customerType: ''
    });

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch all orders
                const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
                const ordersSnapshot = await getDocs(ordersQuery);
                const ordersData = ordersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
                }));
                setOrders(ordersData);

                // Fetch all users (if needed for customer analysis)
                // Assuming we have a 'users' collection. If not, we might need to rely on orders data alone (but visitors count needs users)
                const usersQuery = query(collection(db, 'users'));
                const usersSnapshot = await getDocs(usersQuery);
                const usersData = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt) // Safe check
                }));
                setUsers(usersData);

            } catch (error) {
                console.error("Error fetching analytics data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);



    // Helper: Pre-calculate User Types (Loyalty) for Filtering
    const userTypeMap = useMemo(() => {
        const stats = {};
        orders.forEach(o => {
            const uid = o.userId || 'guest';
            if (uid === 'guest') return;
            if (!stats[uid]) stats[uid] = 0;
            stats[uid]++;
        });

        const map = {};
        Object.keys(stats).forEach(uid => {
            const count = stats[uid];
            if (count >= 5) map[uid] = 'Frequent'; // or Loyal
            else if (count >= 2) map[uid] = 'Repeat';
            else map[uid] = 'One-time';
        });
        return map;
    }, [orders]);

    // Helper: Generate Filter Options
    const filterOptions = useMemo(() => {
        const categories = new Set();
        const products = new Set(); // ID -> Name mapping? Just Names for simple filter
        const payments = new Set();
        
        orders.forEach(o => {
            if (o.paymentMethod) payments.add(o.paymentMethod);
            if (o.items && Array.isArray(o.items)) {
                o.items.forEach(i => {
                    if (i.category) categories.add(i.category);
                    if (i.name) products.add(i.name);
                });
            }
        });

        return {
            categories: Array.from(categories).sort(),
            products: Array.from(products).sort(),
            payments: Array.from(payments).sort(),
            customerTypes: ['One-time', 'Repeat', 'Frequent']
        };
    }, [orders]);

    // Helper: Filter Orders by Date & Global Filters
    const filteredOrders = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let startDate = new Date(0); // Default all time

        switch(dateFilter) {
            case 'today':
                startDate = startOfToday;
                break;
            case 'week':
                const startOfWeek = new Date(startOfToday);
                startOfWeek.setDate(startOfWeek.getDate() - 7);
                startDate = startOfWeek;
                break;
            case 'month':
                const startOfMonth = new Date(startOfToday);
                startOfMonth.setMonth(startOfMonth.getMonth() - 1);
                startDate = startOfMonth;
                break;
            case 'year':
                const startOfYear = new Date(startOfToday);
                startOfYear.setFullYear(startOfYear.getFullYear() - 1);
                startDate = startOfYear;
                break;
            default:
                break;
        }

        return orders.filter(o => {
            // 1. Date Check
            if (o.createdAt < startDate) return false;

            // 2. Payment Method
            if (filters.paymentMode && o.paymentMethod !== filters.paymentMode) return false;

            // 3. Customer Type
            if (filters.customerType && o.userId) {
                const type = userTypeMap[o.userId];
                // "Frequent" mapped to "Loyal"? Let's stick to map keys
                if (type !== filters.customerType) return false;
            } else if (filters.customerType && !o.userId) {
                 // Guest orders don't have types usually, exclude if type filter is active
                 return false;
            }

            // 4. Category & Product (Item Level Check for Order Inclusion)
            if (filters.category || filters.product) {
                if (!o.items || !Array.isArray(o.items)) return false;
                const hasMatch = o.items.some(i => {
                    if (filters.category && i.category !== filters.category) return false;
                    if (filters.product && i.name !== filters.product) return false;
                    return true;
                });
                if (!hasMatch) return false;
            }

            return true;
        });
    }, [orders, dateFilter, filters, userTypeMap]);

    // Helper: Calculate Overview KPIs (Shared)
    const kpis = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
        
        let daysDiff = 1;
        if (totalOrders > 0) {
            const dates = filteredOrders.map(o => o.createdAt.getTime());
            const minDate = Math.min(...dates);
            const maxDate = Math.max(...dates);
            const diffTime = Math.abs(maxDate - minDate);
            daysDiff = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); 
        }
        if (dateFilter === 'today') daysDiff = 1;
        
        const avgOrdersPerDay = (totalOrders / daysDiff).toFixed(1);
        const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0;

        const userCounts = {};
        filteredOrders.forEach(o => {
            if (o.userId) {
                userCounts[o.userId] = (userCounts[o.userId] || 0) + 1;
            }
        });
        const repeatCustomers = Object.values(userCounts).filter(count => count > 1).length;
        const totalUniqueCustomers = Object.keys(userCounts).length;
        const repeatRate = totalUniqueCustomers > 0 ? ((repeatCustomers / totalUniqueCustomers) * 100).toFixed(1) : 0;
        const ordersByRepeaters = filteredOrders.filter(o => userCounts[o.userId] > 1).length;

        const orderValues = filteredOrders.map(o => Number(o.totalAmount) || 0);
        const minOrderValue = orderValues.length > 0 ? Math.min(...orderValues) : 0;
        const maxOrderValue = orderValues.length > 0 ? Math.max(...orderValues) : 0;

        return {
            totalOrders,
            totalRevenue,
            avgOrdersPerDay,
            avgOrderValue,
            repeatRate,
            ordersByRepeaters,
            minOrderValue,
            maxOrderValue
        };
    }, [filteredOrders, dateFilter]);

    // Helper: Product Analysis Data
    const productAnalytics = useMemo(() => {
        const productStats = {};
        const categoryStats = {};

        filteredOrders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const productId = item.id || item.name; // Fallback to name if ID is missing
                    const productName = item.name || 'Unknown Product';
                    const category = item.category || 'Uncategorized';
                    const quantity = Number(item.quantity) || 0;
                    const price = Number(item.price) || 0;
                    const revenue = price * quantity;

                    if (!productStats[productId]) {
                        productStats[productId] = {
                            id: productId,
                            name: productName,
                            category: category,
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    productStats[productId].quantity += quantity;
                    productStats[productId].revenue += revenue;

                    if (!categoryStats[category]) {
                        categoryStats[category] = {
                            name: category,
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    categoryStats[category].quantity += quantity;
                    categoryStats[category].revenue += revenue;
                });
            }
        });

        const topProducts = Object.values(productStats).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
        const categoryPerformance = Object.values(categoryStats).sort((a, b) => b.revenue - a.revenue);

        return { topProducts, categoryPerformance };
    }, [filteredOrders]);

    // Helper: Customer Analysis Data
    const customerAnalytics = useMemo(() => {
        const customerStats = {};
        const now = new Date();
        const highValueThreshold = 10000;

        // Track user first/last order dates for retention logic
        const userFirstOrder = {};
        
        // Process ALL orders
        orders.forEach(order => {
            const userId = order.userId || 'guest';
            if (userId === 'guest') return; 

            if (!customerStats[userId]) {
                customerStats[userId] = {
                    id: userId,
                    orderCount: 0,
                    totalSpend: 0,
                    lastOrderDate: new Date(0),
                    firstOrderDate: order.createdAt, // Init with this, update if earlier found (order is DESC usually, but safety check)
                    name: order.shippingInfo?.fullName || 'Unknown'
                };
            }
            customerStats[userId].orderCount += 1;
            customerStats[userId].totalSpend += (Number(order.totalAmount) || 0);
            
            const orderDate = order.createdAt;
            if (orderDate > customerStats[userId].lastOrderDate) {
                customerStats[userId].lastOrderDate = orderDate;
            }
            // Update first order date (assuming orders might not be sorted strictly or we iterate differently)
            // Ideally we need to find the absolute first order. 
            // Since orders are updated via generic list, let's ensure we track min date
             if (!userFirstOrder[userId] || orderDate < userFirstOrder[userId]) {
                userFirstOrder[userId] = orderDate;
            }
        });

        // Apply first order date back to stats
        Object.keys(customerStats).forEach(uid => {
            customerStats[uid].firstOrderDate = userFirstOrder[uid];
        });

        // Match with Users
        users.forEach(user => {
            if (customerStats[user.id]) {
                customerStats[user.id].name = user.fullName || user.displayName || customerStats[user.id].name;
            }
        });

        // --- Segmentation Counters ---
        const usersWithOrdersCount = Object.keys(customerStats).length;
        const totalRegisteredUsers = users.length;
        const visitorsOnly = Math.max(0, totalRegisteredUsers - usersWithOrdersCount);
        
        // --- Time-based Active Buyers (WAU / MAU / YAU) ---
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

        let wau = 0, mau = 0, yau = 0;
        
        // --- Retention Metrics (Based on selected DateFilter for "New" vs "Returning", and fixed calculation for Churned) ---
        // Definition: 
        // New: First order is within the selected `dateFilter` range.
        // Returning: Placed an order in selected range, but first order was BEFORE the range.
        // Churned: Last order was > 60 days ago.
        
        let newCustomersVal = 0;
        let returningCustomersVal = 0;
        let churnedCustomersVal = 0;

        // Determine Start Date of current filter for Retention Classification
        let filterStartDate = new Date(0);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch(dateFilter) {
            case 'today': filterStartDate = startOfToday; break;
            case 'week': 
                const w = new Date(startOfToday); w.setDate(w.getDate() - 7); filterStartDate = w; break;
            case 'month': 
                 const m = new Date(startOfToday); m.setMonth(m.getMonth() - 1); filterStartDate = m; break;
            case 'year': 
                 const y = new Date(startOfToday); y.setFullYear(y.getFullYear() - 1); filterStartDate = y; break;
            default: break; // 'all' -> everything is new? or based on logic. Let's start from epoch.
        }

        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        // Iterating Customers
        let oneTime = 0, repeat = 0, frequent = 0, highValue = 0;
        
        Object.values(customerStats).forEach(cust => {
            // WAU/MAU/YAU Checks
            if (cust.lastOrderDate >= oneWeekAgo) wau++;
            if (cust.lastOrderDate >= oneMonthAgo) mau++;
            if (cust.lastOrderDate >= oneYearAgo) yau++;

            // Retention Checks
            if (cust.lastOrderDate < sixtyDaysAgo) {
                churnedCustomersVal++;
            } else {
                // Active recently (not churned) - classify performance in current period
                // Check if they had ANY activity in the selected filter period
                // We need to know if they ordered in the filter period. 
                // `cust.lastOrderDate` is the *latest*. It might be in range.
                // But a user might have ordered yesterday (in range) and 2 years ago (first).
                // Detailed check: Did this user place an order >= filterStartDate?
                // We don't have per-order breakdown here easily without re-iterating orders.
                // Optimization: `orders` array is available.
                // Let's use a flag from the orders loop if efficiency needed, but here simple approach:
                // We can't easily know if they ordered in range just from `lastOrderDate` if they ordered multiple times.
                // Actually, `lastOrderDate` >= filterStartDate implies they were active in range.
                // IS THIS TRUE? Yes, if their last order was in range, they are active in range.
                // What if they ordered day before range starts, and then never again? Then lastOrder < filterStartDate.
                
                if (cust.lastOrderDate >= filterStartDate) {
                    if (cust.firstOrderDate >= filterStartDate) {
                        newCustomersVal++;
                    } else {
                        returningCustomersVal++;
                    }
                }
            }

            // Segmentation
            if (cust.totalSpend >= highValueThreshold) {
               // highValue count logic if needed for exclusive chart
            }
            
            if (cust.orderCount >= 5) frequent++;
            else if (cust.orderCount >= 2) repeat++;
            else oneTime++;
        });

         const segments = [
            { name: 'Visitors Only', value: visitorsOnly, color: '#94a3b8' },
            { name: 'One-time Buyers', value: oneTime, color: '#60a5fa' },
            { name: 'Repeat Buyers', value: repeat, color: '#818cf8' },
            { name: 'Frequent Buyers', value: frequent, color: '#a78bfa' },
            { name: 'High Value', value: 0, color: '#f472b6' } // Placeholder if needed or removed
        ].filter(s => s.value > 0);

        // Top List
        const topCustomers = Object.values(customerStats)
            .sort((a, b) => b.totalSpend - a.totalSpend)
            .slice(0, 10)
            .map(c => {
                 let badge = '';
                 const daysSinceLastOrder = (new Date() - c.lastOrderDate) / (1000 * 60 * 60 * 24);
                 if (daysSinceLastOrder > 30) badge = 'At-risk';
                 else if (c.orderCount >= 5) badge = 'Loyal';
                 else if (c.orderCount >= 2) badge = 'Regular';
                 else badge = 'New';
                 return { ...c, badge };
            });

        const conversionRate = totalRegisteredUsers > 0 ? ((usersWithOrdersCount / totalRegisteredUsers) * 100).toFixed(1) : 0;

        return {
            segments,
            topCustomers,
            totalRegisteredUsers,
            usersWithOrdersCount,
            visitorsOnly,
            conversionRate,
            // New Metrics
            activeBuyers: [
                { name: 'Weekly', value: wau, fill: '#3b82f6' },
                { name: 'Monthly', value: mau, fill: '#8b5cf6' },
                { name: 'Yearly', value: yau, fill: '#10b981' },
            ],
            retentionStats: [
                { name: 'New Customers', value: newCustomersVal, fill: '#10b981' },
                { name: 'Returning', value: returningCustomersVal, fill: '#3b82f6' },
                { name: 'Churned (>60d)', value: churnedCustomersVal, fill: '#ef4444' }
            ]
        };

    }, [orders, users, dateFilter]); // Added dateFilter dependency

    // Helper: Revenue Analysis Data
    const revenueAnalytics = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        let totalRevenue = 0;
        let revenueToday = 0;
        let revenueYesterday = 0;
        let revenueMonth = 0;
        let revenueYear = 0;
        
        let cancelledValue = 0;
        let returnedValue = 0;
        
        const paymentStats = {};
        const cityStats = {};
        const categoryStats = {}; 

        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);

        // Get earliest date for Avg calc
        let firstOrderDate = new Date();

        orders.forEach(order => {
             const amount = Number(order.totalAmount) || 0;
             const status = (order.status || '').toLowerCase();
             const date = order.createdAt;

             // Track Loss
             if (status === 'cancelled') {
                 cancelledValue += amount;
                 return; // Don't count in revenue
             }
             if (status === 'returned') {
                 returnedValue += amount;
                 return; 
             }

             totalRevenue += amount;

             if (date < firstOrderDate) firstOrderDate = date;

             // Time-based
             if (date >= startOfToday) {
                 revenueToday += amount;
             } else if (date >= startOfYesterday) {
                 revenueYesterday += amount;
             }
             
             if (date >= startOfMonth) revenueMonth += amount;
             if (date >= startOfYear) revenueYear += amount;

             // Payment Mode
             const paymentMethod = order.paymentMethod || 'Unknown'; // COD, UPI, Card...
             if (!paymentStats[paymentMethod]) paymentStats[paymentMethod] = 0;
             paymentStats[paymentMethod] += amount;

             // City
             const city = order.shippingInfo?.city || order.shippingAddress?.city || 'Unknown';
             if (!cityStats[city]) cityStats[city] = 0;
             cityStats[city] += amount;

             // Category (Need item iteration)
             if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const cat = item.category || 'Uncategorized';
                    const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
                    if (!categoryStats[cat]) categoryStats[cat] = 0;
                    categoryStats[cat] += itemTotal;
                });
             }
        });

        // Avg Revenue / Day
        const daysSinceStart = Math.max(1, Math.ceil((now - firstOrderDate) / (1000 * 60 * 60 * 24)));
        const avgRevenuePerDay = (totalRevenue / daysSinceStart).toFixed(0);

        // Interactables for Charts
        const paymentChartData = Object.keys(paymentStats).map(k => ({ name: k, value: paymentStats[k] }));
        const cityChartData = Object.keys(cityStats)
            .map(k => ({ name: k, value: cityStats[k] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10 cities
        const categoryChartData = Object.keys(categoryStats)
            .map(k => ({ name: k, value: categoryStats[k] }))
            .sort((a,b) => b.value - a.value);

        const revenueTodayTrend = revenueYesterday > 0 
            ? ((revenueToday - revenueYesterday) / revenueYesterday * 100).toFixed(1)
            : revenueToday > 0 ? 100 : 0;

        return {
            totalRevenue,
            revenueToday,
            revenueYesterday,
            revenueTodayTrend,
            revenueMonth,
            revenueYear,
            avgRevenuePerDay,
            cancelledValue,
            returnedValue,
            paymentChartData,
            cityChartData,
            categoryChartData
        };
    }, [orders]);


    // ... (Common Components) ...
    const KpiCard = ({ title, value, icon, trend, subLabel, color, smart, variant, meta }) => (
        <div className={`kpi-card ${smart ? 'smart' : ''} ${variant || ''}`} style={!smart ? { borderLeft: `4px solid ${color}` } : {}}>
            <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="kpi-icon-wrapper" style={!smart ? { background: `${color}20`, color: color } : {}}>
                    {icon}
                </div>
                {trend !== undefined && (
                    <div className={`kpi-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
                        {trend >= 0 ? <FiTrendingUp /> : <FiTrendingUp style={{ transform: 'scaleY(-1)' }} />}
                        <span>{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
            <div>
                <span className="kpi-label">{title}</span>
                <div className="kpi-value">{value}</div>
                {subLabel && <div className="analytics-subtitle" style={smart ? { color: 'rgba(255,255,255,0.7)' } : {}}>{subLabel}</div>}
            </div>
            {meta && <div className="kpi-meta">{meta}</div>}
        </div>
    );

    const DateFilter = () => (
        <div className="date-filter-group">
            {['today', 'week', 'month', 'year', 'all'].map(filter => (
                <button 
                    key={filter}
                    className={`date-filter-btn ${dateFilter === filter ? 'active' : ''}`}
                    onClick={() => setDateFilter(filter)}
                >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
            ))}
        </div>
    );

    const FilterBar = () => (
        <div className="global-filter-bar" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', padding: '15px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <select className="admin-input" style={{ width: 'auto' }} value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
                <option value="">All Categories</option>
                {filterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="admin-input" style={{ width: 'auto' }} value={filters.product} onChange={e => setFilters({...filters, product: e.target.value})}>
                <option value="">All Products</option>
                {filterOptions.products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="admin-input" style={{ width: 'auto' }} value={filters.paymentMode} onChange={e => setFilters({...filters, paymentMode: e.target.value})}>
                <option value="">All Payment Modes</option>
                {filterOptions.payments.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="admin-input" style={{ width: 'auto' }} value={filters.customerType} onChange={e => setFilters({...filters, customerType: e.target.value})}>
                <option value="">All Customer Types</option>
                {filterOptions.customerTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(filters.category || filters.product || filters.paymentMode || filters.customerType) && (
                <button 
                    onClick={() => setFilters({ category: '', product: '', paymentMode: '', customerType: '' })}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ef4444', color: '#ef4444', background: 'white', cursor: 'pointer' }}
                >
                    Clear Filters
                </button>
            )}
        </div>
    );

    if (loading) return <div className="loading-state"><div className="spinner"></div></div>;

    // VIEW: CUSTOMER ANALYSIS
    if (isCustomersView) {
        return (
             <div className="analytics-page">
                 <div className="analytics-header">
                     <div>
                        <h1 className="analytics-title">Customer Intelligence</h1>
                        <p className="analytics-subtitle">Understand your audience and their buying behavior</p>
                    </div>
                    {/* Added Date Filter for New/Returning Calc */}
                    <DateFilter /> 
                </div>
                <FilterBar />

                {/* Login vs Purchase Stats Row */}
                <div className="kpi-grid">
                    <KpiCard title="Total Registered" value={customerAnalytics.totalRegisteredUsers} icon={<FiUsers />} color="#64748b" subLabel="Potential Customers" />
                    <KpiCard title="Active Buyers" value={customerAnalytics.usersWithOrdersCount} icon={<FiUserCheck />} color="#10b981" subLabel="Have placed orders" />
                    <KpiCard title="Visitors Only" value={customerAnalytics.visitorsOnly} icon={<FiUserPlus />} color="#f59e0b" subLabel="Registered but no purchase" />
                    <KpiCard title="Conversion Rate" value={`${customerAnalytics.conversionRate}%`} icon={<FiTrendingUp />} color="#3b82f6" subLabel="Users to Buyers" />
                </div>

                {/* Time-Based & Retention Analysis Row (New) */}
                <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                     <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">Active Buyers (Time-based)</h3>
                            <p className="analytics-subtitle">WAU / MAU / YAU</p>
                        </div>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={customerAnalytics.activeBuyers} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {customerAnalytics.activeBuyers.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>

                    {/* Most Purchasing Customers Table */}
                     <div className="chart-card">
                        <div className="chart-header"><h3 className="chart-title">Top Purchasing Customers</h3></div>
                        <div style={{ overflowX: 'auto' }}>
                             <table className="admin-table" style={{ width: '100%', marginTop: '0' }}>
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Orders</th>
                                        <th>Total Spend</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerAnalytics.topCustomers.map((c, i) => (
                                        <tr key={i}>
                                            <td>
                                                <div style={{ fontWeight: '500' }}>{c.name}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(c.lastOrderDate).toLocaleDateString()}</div>
                                            </td>
                                            <td>{c.orderCount}</td>
                                            <td style={{ fontWeight: '600' }}>₹{c.totalSpend.toLocaleString()}</td>
                                            <td>
                                                {c.badge === 'Loyal' && <span className="status-badge status-delivered">Loyal</span>}
                                                {c.badge === 'Regular' && <span className="status-badge status-processing">Regular</span>}
                                                {c.badge === 'At-risk' && <span className="status-badge status-cancelled">At Risk</span>}
                                                {c.badge === 'New' && <span className="status-badge status-pending">New</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                </div>
             </div>
        );
    }



    // VIEW: ORDERS ANALYSIS (Keep as is)
    // ... (Order View Logic)
    if (isOrdersView) {
         const chartData = Object.values(orders.filter(o => {
            return true;
         }).reduce((grouped, order) => {
             if (!filteredOrders.includes(order)) return grouped;
            const date = order.createdAt;
            let key = '';
            if (chartGroup === 'day') key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            else if (chartGroup === 'month') key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            else key = date.getFullYear().toString();

            if (!grouped[key]) grouped[key] = { name: key, orders: 0, revenue: 0, rawDate: date, isWeekend: false };
            grouped[key].orders += 1;
            grouped[key].revenue += (Number(order.totalAmount) || 0);
            
            const day = date.getDay();
            if (day === 0 || day === 6) grouped[key].isWeekend = true;
            
            return grouped;
         }, {})).sort((a,b) => a.rawDate - b.rawDate);

          const orderStatusData = (() => {
            const statusCounts = {};
            filteredOrders.forEach(o => {
                let status = o.status || 'Pending';
                status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            return Object.keys(statusCounts).filter(k => statusCounts[k] > 0).map(k => ({ name: k, value: statusCounts[k] }));
        })();

         const COLORS = {
            'Delivered': '#10b981', 'Cancelled': '#ef4444', 'Returned': '#f59e0b',
            'Pending': '#f97316', 'Processing': '#8b5cf6', 'Shipped': '#3b82f6'
        };

        return (
            <div className="analytics-page">
                <div className="analytics-header">
                     <div>
                        <h1 className="analytics-title">Orders Analysis</h1>
                        <p className="analytics-subtitle">Detailed breakdown of order metrics and trends</p>
                    </div>
                    <DateFilter />
                </div>
                <FilterBar />

                <div className="kpi-grid">
                     <KpiCard title="Total Orders" value={kpis.totalOrders} icon={<FiShoppingBag />} color="#3b82f6" />
                    <KpiCard title="Repeated Orders" value={kpis.ordersByRepeaters} icon={<FiRepeat />} color="#8b5cf6" subLabel={`${kpis.repeatRate}% of total users`} />
                     <KpiCard title="Avg Order Value" value={`₹${kpis.avgOrderValue}`} icon={<FiBarChart2 />} color="#10b981" />
                    <KpiCard title="Min Order Value" value={`₹${kpis.minOrderValue}`} icon={<FiArrowDown />} color="#f59e0b" />
                    <KpiCard title="Max Order Value" value={`₹${kpis.maxOrderValue}`} icon={<FiArrowUp />} color="#ef4444" />
                </div>

                <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                        <div className="chart-header">
                            <h3 className="chart-title">Avg Orders & Peak Days</h3>
                             <p className="analytics-subtitle">Avg Orders/Day: <strong>{kpis.avgOrdersPerDay}</strong></p>
                        </div>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Legend />
                                    <Bar dataKey="orders" name="Number of Orders" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.isWeekend ? '#f59e0b' : '#3b82f6'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#64748b', marginTop: '10px', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '4px' }}></span>Weekday</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '4px' }}></span>Peak/Weekend</div>
                        </div>
                    </div>


                </div>
            </div>
        );
    }

    // VIEW: REVENUE ANALYSIS
    if (isRevenueView) {
        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

        return (
            <div className="analytics-page">
                 <div className="analytics-header">
                     <div>
                        <h1 className="analytics-title">Revenue Analysis</h1>
                        <p className="analytics-subtitle">Financial performance and health metrics</p>
                    </div>
                    <DateFilter />
                </div>
                <FilterBar />

                {/* Revenue KPIs */}
                <div className="kpi-grid">
                    <KpiCard title="Total Revenue" value={`₹${revenueAnalytics.totalRevenue.toLocaleString()}`} icon={<FiDollarSign />} color="#10b981" subLabel="All time (Net)" />
                    <KpiCard title="Revenue Today" value={`₹${revenueAnalytics.revenueToday.toLocaleString()}`} icon={<FiCalendar />} color="#3b82f6" />
                    <KpiCard title="Monthly Revenue" value={`₹${revenueAnalytics.revenueMonth.toLocaleString()}`} icon={<FiBarChart2 />} color="#8b5cf6" subLabel="This month" />
                    <KpiCard title="Yearly Revenue" value={`₹${revenueAnalytics.revenueYear.toLocaleString()}`} icon={<FiTrendingUp />} color="#f59e0b" subLabel="This year" />
                    <KpiCard title="Avg Rev / Day" value={`₹${revenueAnalytics.avgRevenuePerDay}`} icon={<FiPieChart />} color="#ec4899" />
                </div>




            </div>
        );
    }

    // View: Overview (Default)
     const overviewChartData = Object.values(orders.filter(o => filteredOrders.includes(o)).reduce((grouped, order) => {
        const date = order.createdAt;
        let key = '';
        if (chartGroup === 'day') key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        else if (chartGroup === 'month') key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        else key = date.getFullYear().toString();

        if (!grouped[key]) grouped[key] = { name: key, orders: 0, revenue: 0, rawDate: date };
        grouped[key].orders += 1;
        grouped[key].revenue += (Number(order.totalAmount) || 0);
        return grouped;
    }, {})).sort((a, b) => a.rawDate - b.rawDate);

    if (!isOverview) {
         return (
            <div className="analytics-page">
                <div className="analytics-header"><h1 className="analytics-title">{viewTitle}</h1></div>
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px' }}>
                    <h2>Coming Soon</h2>
                    <p>Detailed analysis for {viewTitle} is under development.</p>
                </div>
            </div>
         );
    }

    return (
        <div className="analytics-page">
            <div className="analytics-header">
                <div><h1 className="analytics-title">Analytics Overview</h1><p className="analytics-subtitle">Monitor your business performance</p></div>
                <DateFilter />
            </div>
            <FilterBar />

            <div className="kpi-grid">
                <KpiCard 
                    title="Today's Revenue" 
                    value={`₹${revenueAnalytics.revenueToday.toLocaleString()}`} 
                    icon={<FiDollarSign />} 
                    trend={revenueAnalytics.revenueTodayTrend}
                    subLabel={`vs yesterday (₹${revenueAnalytics.revenueYesterday.toLocaleString()})`}
                    smart={true}
                    variant="green"
                    meta="Last updated: Just now"
                />
                <KpiCard 
                    title="Total Revenue" 
                    value={`₹${kpis.totalRevenue.toLocaleString()}`} 
                    icon={<FiTrendingUp />} 
                    color="#10b981" 
                    subLabel="Gross revenue" 
                    smart={true}
                    variant="blue"
                />
                <KpiCard 
                    title="Total Orders" 
                    value={kpis.totalOrders} 
                    icon={<FiShoppingBag />} 
                    color="#3b82f6" 
                    subLabel="In selected period" 
                    smart={true}
                    variant="purple"
                />
                <KpiCard title="Avg Orders / Day" value={kpis.avgOrdersPerDay} icon={<FiBarChart2 />} color="#f59e0b" />
                <KpiCard title="Repeat Customer %" value={`${kpis.repeatRate}%`} icon={<FiUsers />} color="#ec4899" subLabel="Returning customers" />
            </div>

            <div className="charts-grid">
                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Orders & Revenue Trend</h3>
                        <div className="chart-filters">
                             <select className="chart-filter-select" value={chartGroup} onChange={(e) => setChartGroup(e.target.value)}>
                                <option value="day">Daily</option>
                                <option value="month">Monthly</option>
                                <option value="year">Yearly</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <AreaChart data={overviewChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                <Area yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
