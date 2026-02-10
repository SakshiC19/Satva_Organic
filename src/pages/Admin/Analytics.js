import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, getDocs, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
    FiTrendingUp, FiShoppingBag, FiDollarSign, FiUsers, FiRepeat,
    FiCalendar, FiBarChart2, FiPieChart, FiMinusCircle, FiArrowUp, FiArrowDown, FiPackage,
    FiUserCheck, FiUserPlus, FiLogIn, FiDownload, FiChevronDown, FiX
} from 'react-icons/fi';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, LabelList
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
        product: '',
        paymentMode: '',
        customerType: ''
    });
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [showViewSelector, setShowViewSelector] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null); // 'category', 'product', 'payment', 'customer'
    const [allCategories, setAllCategories] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [productCategoryMap, setProductCategoryMap] = useState({});

    const navigate = useNavigate();

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

                // Fetch Categories for Filter
                const categoriesSnapshot = await getDocs(collection(db, 'categories'));
                setAllCategories(categoriesSnapshot.docs.map(doc => doc.data().name).sort());

                // Fetch Products for Filter
                const productsSnapshot = await getDocs(collection(db, 'products'));
                const productsList = productsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAllProducts(productsList.map(p => p.name).sort());

                // Create category map
                const catMap = {};
                productsList.forEach(p => {
                    catMap[p.name] = p.category || p.categoryName || 'Uncategorized';
                });
                setProductCategoryMap(catMap);
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

        switch (dateFilter) {
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
            case 'custom':
                if (customRange.start) startDate = new Date(customRange.start);
                break;
            default:
                break;
        }

        let endDate = new Date(); // Default to now
        if (dateFilter === 'custom' && customRange.end) {
            endDate = new Date(customRange.end);
            endDate.setHours(23, 59, 59, 999);
        } else if (dateFilter !== 'custom' && dateFilter !== 'all') {
            // For standard filters, usually we want up to *now*, which is fine.
            // But if we want strictly the period:
            // e.g. "yesterday" (not implemented but if it were)
        }

        return orders.filter(o => {
            // 1. Date Check
            if (o.createdAt < startDate || o.createdAt > endDate) return false;

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
                    const cat = i.category || productCategoryMap[i.name];
                    if (filters.category && cat !== filters.category) return false;
                    if (filters.product && i.name !== filters.product) return false;
                    return true;
                });
                if (!hasMatch) return false;
            }

            return true;
        });
    }, [orders, dateFilter, filters, userTypeMap, customRange, productCategoryMap]);

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
                    const productId = item.id || item.name;
                    const productName = item.name || 'Unknown Product';
                    let category = item.category || productCategoryMap[productName] || 'Uncategorized';

                    // Normalize Category: Trim and Title Case to prevent duplicates
                    category = category.trim().replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

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
        const categoryPerformance = Object.values(categoryStats)
            .filter(c => c.name !== 'Uncategorized')
            .sort((a, b) => b.revenue - a.revenue);

        return { topProducts, categoryPerformance };
    }, [filteredOrders, productCategoryMap]);

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
        switch (dateFilter) {
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

    }, [orders, users, dateFilter, productCategoryMap]); // Added dateFilter dependency

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
                    const cat = item.category || productCategoryMap[item.name] || 'Uncategorized';
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
            .filter(k => k !== 'Uncategorized')
            .map(k => ({ name: k, value: categoryStats[k] }))
            .sort((a, b) => b.value - a.value);

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

    const DateFilter = () => {
        if (dateFilter === 'custom') {
            return (
                <div className="date-filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', paddingLeft: '8px' }}>Custom:</span>
                    <input
                        type="date"
                        className="admin-input"
                        style={{ width: '130px', padding: '6px', fontSize: '12px', height: '32px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        value={customRange.start}
                        onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                    />
                    <span style={{ color: '#64748b', fontSize: '13px' }}>to</span>
                    <input
                        type="date"
                        className="admin-input"
                        style={{ width: '130px', padding: '6px', fontSize: '12px', height: '32px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        value={customRange.end}
                        onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                    />
                    <button
                        onClick={() => setDateFilter('month')} // Revert to default or clear?
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center' }}
                        title="Close Custom Filter"
                    >
                        <FiX size={16} />
                    </button>
                </div>
            );
        }

        return (
            <div className="date-filter-group" style={{ display: 'flex', background: '#fff', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                {['today', 'week', 'month', 'year', 'all', 'custom'].map(filter => (
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
    };

    const FilterBar = () => (
        <div className="global-filter-bar" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', padding: '15px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <select className="admin-input" style={{ width: 'auto' }} value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
                <option value="">All Categories</option>
                {filterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="admin-input" style={{ width: 'auto' }} value={filters.product} onChange={e => setFilters({ ...filters, product: e.target.value })}>
                <option value="">All Products</option>
                {filterOptions.products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="admin-input" style={{ width: 'auto' }} value={filters.paymentMode} onChange={e => setFilters({ ...filters, paymentMode: e.target.value })}>
                <option value="">All Payment Modes</option>
                {filterOptions.payments.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="admin-input" style={{ width: 'auto' }} value={filters.customerType} onChange={e => setFilters({ ...filters, customerType: e.target.value })}>
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
                {/* Header */}
                <div className="analytics-header">
                    <div>
                        <h1 className="analytics-title">Customer Intelligence <FiChevronDown style={{ fontSize: '20px', color: '#94a3b8' }} /></h1>
                        <p className="analytics-subtitle">Track acquisition, retention, and loyalty metrics</p>
                    </div>
                    <div className="header-actions">
                        <DateFilter />
                    </div>
                </div>

                {/* Filter Dropdown Cards */}
                <div className="filter-cards-row">
                    <div className="filter-card">
                        <div className="filter-card-label">CATEGORY</div>
                        <div className="filter-card-value">
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {filters.category || 'All Categories'}
                            </span>
                            <FiChevronDown style={{ flexShrink: 0 }} />
                        </div>
                        <select
                            value={filters.category}
                            onChange={e => setFilters({ ...filters, category: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Categories</option>
                            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="filter-card">
                        <div className="filter-card-label">PRODUCT</div>
                        <div className="filter-card-value">
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {filters.product || 'All Products'}
                            </span>
                            <FiChevronDown style={{ flexShrink: 0 }} />
                        </div>
                        <select
                            value={filters.product}
                            onChange={e => setFilters({ ...filters, product: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Products</option>
                            {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="filter-card">
                        <div className="filter-card-label">PAYMENT MODE</div>
                        <div className="filter-card-value">{filters.paymentMode || 'All Payment Modes'} <FiChevronDown /></div>
                        <select
                            value={filters.paymentMode}
                            onChange={e => setFilters({ ...filters, paymentMode: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Payment Modes</option>
                            {filterOptions.payments.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="filter-card">
                        <div className="filter-card-label">CUSTOMER TYPE</div>
                        <div className="filter-card-value">{filters.customerType || 'All Customer Types'} <FiChevronDown /></div>
                        <select
                            value={filters.customerType}
                            onChange={e => setFilters({ ...filters, customerType: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Customer Types</option>
                            {filterOptions.customerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="kpi-grid">
                    {/* Registered (Purple) */}
                    <div className="kpi-card-new purple">
                        <div>
                            <div className="kpi-icon-box"><FiUsers /></div>
                            <div className="kpi-label-new">REGISTERED</div>
                            <div className="kpi-value-new">{customerAnalytics.totalRegisteredUsers}</div>
                        </div>
                        <div className="kpi-sub-new">Total accounts</div>
                    </div>

                    {/* Active Buyers (Green) */}
                    <div className="kpi-card-new green">
                        <div>
                            <div className="kpi-icon-box"><FiUserCheck /></div>
                            <div className="kpi-label-new">ACTIVE BUYERS</div>
                            <div className="kpi-value-new">{customerAnalytics.usersWithOrdersCount}</div>
                        </div>
                        <div className="kpi-sub-new">Placed at least 1 order</div>
                    </div>

                    {/* Conversion (Blue) */}
                    <div className="kpi-card-new blue">
                        <div>
                            <div className="kpi-icon-box"><FiTrendingUp /></div>
                            <div className="kpi-label-new">CONVERSION</div>
                            <div className="kpi-value-new">{customerAnalytics.conversionRate}%</div>
                        </div>
                        <div className="kpi-sub-new">Users to Buyers</div>
                    </div>

                    {/* Visitors Only (White) */}
                    <div className="kpi-card-new white" style={{ borderLeft: '6px solid #f59e0b' }}>
                        <div>
                            <div className="kpi-icon-box" style={{ background: '#fffbeb', color: '#f59e0b' }}><FiUserPlus /></div>
                            <div className="kpi-label-new" style={{ color: '#64748b' }}>VISITORS ONLY</div>
                            <div className="kpi-value-new" style={{ color: '#1e293b' }}>{customerAnalytics.visitorsOnly}</div>
                            <div className="kpi-sub-new" style={{ color: '#64748b' }}>No purchase yet</div>
                        </div>
                    </div>
                </div>

                <div className="charts-split">
                    {/* Customer Retention Status */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">Customer Retention Status</h3>
                        </div>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={customerAnalytics.retentionStats}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={5}
                                    >
                                        <Cell fill="#10b981" /> {/* New */}
                                        <Cell fill="#3b82f6" /> {/* Returning */}
                                        <Cell fill="#ef4444" /> {/* Churned */}
                                    </Pie>
                                    <Tooltip />
                                    <Legend
                                        layout="horizontal"
                                        align="center"
                                        verticalAlign="bottom"
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Buying Frequency (LTV) */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">Buying Frequency (LTV)</h3>
                        </div>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart
                                    layout="vertical"
                                    data={customerAnalytics.segments}
                                    margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                                        {customerAnalytics.segments.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Top Loyalty Customers Table */}
                <div className="table-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Top Loyalty Customers</h3>
                    </div>
                    <div className="products-table-container">
                        <table className="products-table">
                            <thead>
                                <tr>
                                    <th>CUSTOMER</th>
                                    <th>ORDERS</th>
                                    <th>TOTAL SPEND</th>
                                    <th>LAST ACTIVITY</th>
                                    <th>SEGMENT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerAnalytics.topCustomers.map((c, i) => (
                                    <tr key={i} className="product-row">
                                        <td>
                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{c.name}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {c.id.slice(0, 8)}...</div>
                                        </td>
                                        <td style={{ fontWeight: '600' }}>{c.orderCount}</td>
                                        <td className="price-text">₹{c.totalSpend.toLocaleString()}</td>
                                        <td style={{ color: '#64748b', fontSize: '13px' }}>{new Date(c.lastOrderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                        <td>
                                            {c.badge === 'Loyal' && <span className="category-pill" style={{ background: '#ecfdf5', color: '#10b981' }}>Loyal</span>}
                                            {c.badge === 'Regular' && <span className="category-pill" style={{ background: '#eff6ff', color: '#3b82f6' }}>Regular</span>}
                                            {c.badge === 'At-risk' && <span className="category-pill" style={{ background: '#fef2f2', color: '#ef4444' }}>At-Risk</span>}
                                            {c.badge === 'New' && <span className="category-pill" style={{ background: '#f1f5f9', color: '#64748b' }}>New</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
        }, {})).sort((a, b) => a.rawDate - b.rawDate);

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
                {/* Header */}
                <div className="analytics-header">
                    <div>
                        <h1 className="analytics-title">Orders Analysis <FiChevronDown style={{ fontSize: '20px', color: '#94a3b8' }} /></h1>
                        <p className="analytics-subtitle">Detailed breakdown of transaction volume and status distribution</p>
                    </div>
                    <div className="header-actions">
                        <DateFilter />
                    </div>
                </div>

                {/* Filter Dropdown Cards */}
                <div className="filter-cards-row">
                    <div className="filter-card">
                        <div className="filter-card-label">CATEGORY</div>
                        <div className="filter-card-value">
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {filters.category || 'All Categories'}
                            </span>
                            <FiChevronDown style={{ flexShrink: 0 }} />
                        </div>
                        <select
                            value={filters.category}
                            onChange={e => setFilters({ ...filters, category: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Categories</option>
                            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="filter-card">
                        <div className="filter-card-label">PRODUCT</div>
                        <div className="filter-card-value">
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {filters.product || 'All Products'}
                            </span>
                            <FiChevronDown style={{ flexShrink: 0 }} />
                        </div>
                        <select
                            value={filters.product}
                            onChange={e => setFilters({ ...filters, product: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Products</option>
                            {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="filter-card">
                        <div className="filter-card-label">PAYMENT MODE</div>
                        <div className="filter-card-value">{filters.paymentMode || 'All Payment Modes'} <FiChevronDown /></div>
                        <select
                            value={filters.paymentMode}
                            onChange={e => setFilters({ ...filters, paymentMode: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Payment Modes</option>
                            {filterOptions.payments.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="filter-card">
                        <div className="filter-card-label">CUSTOMER TYPE</div>
                        <div className="filter-card-value">{filters.customerType || 'All Customer Types'} <FiChevronDown /></div>
                        <select
                            value={filters.customerType}
                            onChange={e => setFilters({ ...filters, customerType: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Customer Types</option>
                            {filterOptions.customerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="kpi-grid">
                    {/* Total Orders (Blue) */}
                    <div className="kpi-card-new blue">
                        <div>
                            <div className="kpi-icon-box"><FiShoppingBag /></div>
                            <div className="kpi-label-new">TOTAL</div>
                            <div className="kpi-value-new">{kpis.totalOrders}</div>
                        </div>
                    </div>

                    {/* Repeated Orders (Purple) */}
                    <div className="kpi-card-new purple">
                        <div>
                            <div className="kpi-icon-box"><FiRepeat /></div>
                            <div className="kpi-label-new">REPEAT</div>
                            <div className="kpi-value-new">{kpis.ordersByRepeaters}</div>
                            <div className="kpi-sub-new">{kpis.repeatRate}% Rate</div>
                        </div>
                    </div>

                    {/* Avg Value (White) */}
                    <div className="kpi-card-new white" style={{ borderLeft: '6px solid #10b981' }}>
                        <div>
                            <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#10b981' }}><FiBarChart2 /></div>
                            <div className="kpi-label-new" style={{ color: '#64748b' }}>AVG VALUE</div>
                            <div className="kpi-value-new" style={{ color: '#1e293b' }}>₹{kpis.avgOrderValue}</div>
                            <div className="kpi-sub-new" style={{ color: '#64748b' }}>Per transaction</div>
                        </div>
                    </div>

                    {/* Max Value (White) */}
                    <div className="kpi-card-new white" style={{ borderLeft: '6px solid #10b981' }}>
                        <div>
                            <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#10b981' }}><FiArrowUp /></div>
                            <div className="kpi-label-new" style={{ color: '#64748b' }}>PEAK VALUE</div>
                            <div className="kpi-value-new" style={{ color: '#1e293b' }}>₹{kpis.maxOrderValue}</div>
                        </div>
                    </div>
                </div>

                <div className="charts-split">
                    {/* Order Frequency Chart */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">Order Frequency & Peaks</h3>
                        </div>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="orders" name="Orders" radius={[6, 6, 0, 0]} barSize={40}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.isWeekend ? '#f59e0b' : '#3b82f6'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#3b82f6' }}></div> Weekdays
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#f59e0b' }}></div> Weekends / Peak
                            </div>
                        </div>
                    </div>

                    {/* Status Breakdown Chart */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">Status Breakdown</h3>
                        </div>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={orderStatusData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110} // Thinner ring
                                        paddingAngle={2}
                                    >
                                        {orderStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend
                                        layout="vertical"
                                        align="center"
                                        verticalAlign="bottom"
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', width: '100%' }}
                                        content={(props) => {
                                            const { payload } = props;
                                            return (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', fontSize: '12px', color: '#64748b', paddingTop: '20px' }}>
                                                    {payload.map((entry, index) => (
                                                        <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }}></div>
                                                            {entry.value}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        );

    }

    // VIEW: REVENUE ANALYSIS
    if (isRevenueView) {
        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
        const PAYMENT_COLORS = { 'cod': '#3b82f6', 'online': '#10b981', 'razorpay': '#10b981', 'cash': '#3b82f6' };

        return (
            <div className="analytics-page">
                {/* Header */}
                <div className="analytics-header">
                    <div>
                        <h1 className="analytics-title">Financial Performance <FiChevronDown style={{ fontSize: '20px', color: '#94a3b8' }} /></h1>
                        <p className="analytics-subtitle">Deep dive into revenue, losses, and payment dynamics</p>
                    </div>
                    <div className="header-actions">
                        <DateFilter />
                    </div>
                </div>

                {/* Filter Dropdown Cards */}
                <div className="filter-cards-row">
                    <div className="filter-card">
                        <div className="filter-card-label">CATEGORY</div>
                        <div className="filter-card-value">
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {filters.category || 'All Categories'}
                            </span>
                            <FiChevronDown style={{ flexShrink: 0 }} />
                        </div>
                        <select
                            value={filters.category}
                            onChange={e => setFilters({ ...filters, category: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Categories</option>
                            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="filter-card">
                        <div className="filter-card-label">PRODUCT</div>
                        <div className="filter-card-value">
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {filters.product || 'All Products'}
                            </span>
                            <FiChevronDown style={{ flexShrink: 0 }} />
                        </div>
                        <select
                            value={filters.product}
                            onChange={e => setFilters({ ...filters, product: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Products</option>
                            {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="filter-card">
                        <div className="filter-card-label">PAYMENT MODE</div>
                        <div className="filter-card-value">{filters.paymentMode || 'All Payment Modes'} <FiChevronDown /></div>
                        <select
                            value={filters.paymentMode}
                            onChange={e => setFilters({ ...filters, paymentMode: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Payment Modes</option>
                            {filterOptions.payments.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="filter-card">
                        <div className="filter-card-label">CUSTOMER TYPE</div>
                        <div className="filter-card-value">{filters.customerType || 'All Customer Types'} <FiChevronDown /></div>
                        <select
                            value={filters.customerType}
                            onChange={e => setFilters({ ...filters, customerType: e.target.value })}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        >
                            <option value="">All Customer Types</option>
                            {filterOptions.customerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* Revenue KPIs */}
                <div className="kpi-grid">
                    {/* Net Revenue (Green) */}
                    <div className="kpi-card-new green" style={{ justifyContent: 'center', alignItems: 'flex-start' }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px', marginBottom: '16px' }}><FiDollarSign size={24} /></div>
                        <div className="kpi-label-new">NET REVENUE</div>
                        <div className="kpi-value-new" style={{ fontSize: '32px' }}>₹{revenueAnalytics.totalRevenue.toLocaleString()}</div>
                    </div>

                    {/* Today (White) */}
                    <div className="kpi-card-new white" style={{ borderLeft: '6px solid #3b82f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <div>
                                <div className="kpi-icon-box" style={{ background: '#eff6ff', color: '#3b82f6' }}><FiCalendar /></div>
                                <div className="kpi-label-new" style={{ color: '#64748b' }}>TODAY</div>
                                <div className="kpi-value-new" style={{ color: '#1e293b' }}>₹{revenueAnalytics.revenueToday.toLocaleString()}</div>
                            </div>
                            {revenueAnalytics.revenueTodayTrend > 0 && <span className="category-pill" style={{ background: '#ecfdf5', color: '#10b981', height: 'fit-content' }}>↑ {revenueAnalytics.revenueTodayTrend}%</span>}
                        </div>
                    </div>

                    {/* Loss: Cancelled (White/Red) */}
                    <div className="kpi-card-new white" style={{ borderLeft: '6px solid #ef4444' }}>
                        <div>
                            <div className="kpi-icon-box" style={{ background: '#fef2f2', color: '#ef4444' }}><FiMinusCircle /></div>
                            <div className="kpi-label-new" style={{ color: '#64748b' }}>LOSS: CANCELLED</div>
                            <div className="kpi-value-new" style={{ color: '#1e293b' }}>₹{revenueAnalytics.cancelledValue.toLocaleString()}</div>
                            <div className="kpi-sub-new" style={{ color: '#64748b' }}>Missed potential</div>
                        </div>
                    </div>
                    {/* Avg Rev / Day (White/Purple) */}
                    <div className="kpi-card-new white" style={{ borderLeft: '6px solid #8b5cf6' }}>
                        <div>
                            <div className="kpi-icon-box" style={{ background: '#f5f3ff', color: '#8b5cf6' }}><FiPieChart /></div>
                            <div className="kpi-label-new" style={{ color: '#64748b' }}>AVG REV / DAY</div>
                            <div className="kpi-value-new" style={{ color: '#1e293b' }}>₹{revenueAnalytics.avgRevenuePerDay}</div>
                        </div>
                    </div>
                </div>

                <div className="charts-split">
                    {/* Revenue by Category (Bar Chart) */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">Revenue by Category</h3>
                        </div>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart
                                    data={revenueAnalytics.categoryChartData.slice(0, 5)} // Top 5
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        formatter={(value) => `₹${value.toLocaleString()}`}
                                    />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={40}>
                                        <LabelList dataKey="name" position="insideLeft" fill="white" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                                        <LabelList dataKey="value" position="insideRight" fill="white" formatter={(val) => `₹${val}`} style={{ fontSize: '12px' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Payment Mode Distribution (Donut) */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">Payment Mode Distribution</h3>
                        </div>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={revenueAnalytics.paymentChartData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={5}
                                    >
                                        {revenueAnalytics.paymentChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name.toLowerCase()] || '#94a3b8'} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                                    <Legend
                                        layout="horizontal"
                                        align="center"
                                        verticalAlign="bottom"
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Revenue by Region (Cities) - New Table Style */}
                <div className="table-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Revenue by Region (Cities)</h3>
                    </div>
                    <div className="products-table-container">
                        <table className="products-table">
                            <thead>
                                <tr>
                                    <th>CITY</th>
                                    <th>TOTAL REVENUE</th>
                                    <th>CONTRIBUTION %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {revenueAnalytics.cityChartData.map((city, i) => (
                                    <tr key={i} className="product-row">
                                        <td style={{ fontWeight: '600', color: '#1e293b' }}>{city.name}</td>
                                        <td className="price-text">₹{city.value.toLocaleString()}</td>
                                        <td style={{ width: '40%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${(city.value / revenueAnalytics.totalRevenue * 100).toFixed(1)}%`, height: '100%', background: '#3b82f6', borderRadius: '4px' }}></div>
                                                </div>
                                                <span style={{ fontSize: '12px', color: '#64748b', minWidth: '40px' }}>{(city.value / revenueAnalytics.totalRevenue * 100).toFixed(1)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                <div>
                    <h1 className="analytics-title">Data Analysis Overview <FiChevronDown style={{ fontSize: '20px', color: '#94a3b8' }} /></h1>
                    <p className="analytics-subtitle">Monitor logins, orders, and category-wise performance</p>
                </div>
                <div className="header-actions">
                    <DateFilter />
                </div>
            </div>

            {/* Filter Dropdown Cards */}
            <div className="filter-cards-row">
                {/* Category Filter */}
                <div className="filter-card">
                    <div className="filter-card-label">CATEGORY</div>
                    <div className="filter-card-value">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {filters.category || 'All Categories'}
                        </span>
                        <FiChevronDown style={{ flexShrink: 0 }} />
                    </div>
                    <select
                        value={filters.category}
                        onChange={e => setFilters({ ...filters, category: e.target.value })}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    >
                        <option value="">All Categories</option>
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                {/* Product Filter */}
                <div className="filter-card">
                    <div className="filter-card-label">PRODUCT</div>
                    <div className="filter-card-value">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {filters.product || 'All Products'}
                        </span>
                        <FiChevronDown style={{ flexShrink: 0 }} />
                    </div>
                    <select
                        value={filters.product}
                        onChange={e => setFilters({ ...filters, product: e.target.value })}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    >
                        <option value="">All Products</option>
                        {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                {/* Payment Filter */}
                <div className="filter-card">
                    <div className="filter-card-label">PAYMENT MODE</div>
                    <div className="filter-card-value">{filters.paymentMode || 'All Payment Modes'} <FiChevronDown /></div>
                    <select
                        value={filters.paymentMode}
                        onChange={e => setFilters({ ...filters, paymentMode: e.target.value })}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    >
                        <option value="">All Payment Modes</option>
                        {filterOptions.payments.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                {/* Customer Type Filter */}
                <div className="filter-card">
                    <div className="filter-card-label">CUSTOMER TYPE</div>
                    <div className="filter-card-value">{filters.customerType || 'All Customer Types'} <FiChevronDown /></div>
                    <select
                        value={filters.customerType}
                        onChange={e => setFilters({ ...filters, customerType: e.target.value })}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    >
                        <option value="">All Customer Types</option>
                        {filterOptions.customerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            <div className="kpi-grid">
                {/* Total Logins (Blue) */}
                <div className="kpi-card-new blue">
                    <div>
                        <div className="kpi-icon-box"><FiLogIn /></div>
                        <div className="kpi-label-new">TOTAL LOGINS</div>
                        <div className="kpi-value-new">{customerAnalytics.totalRegisteredUsers}</div>
                        <div className="kpi-sub-new">Total customer registrations</div>
                    </div>
                    <div className="kpi-meta-new">Number of unique accounts</div>
                </div>

                {/* Total Orders (Purple) */}
                <div className="kpi-card-new purple">
                    <div>
                        <div className="kpi-icon-box"><FiShoppingBag /></div>
                        <div className="kpi-label-new">TOTAL ORDERS</div>
                        <div className="kpi-value-new">{kpis.totalOrders}</div>
                        <div className="kpi-sub-new">Orders in period</div>
                    </div>
                    <div className="kpi-meta-new">Avg ₹{kpis.avgOrderValue} / order</div>
                </div>

                {/* Repeat Orders (Green) */}
                <div className="kpi-card-new green">
                    <div>
                        <div className="kpi-icon-box"><FiRepeat /></div>
                        <div className="kpi-label-new">REPEAT ORDERS</div>
                        <div className="kpi-value-new">{kpis.ordersByRepeaters}</div>
                        <div className="kpi-sub-new">{kpis.repeatRate}% Repeat Rate</div>
                    </div>
                    <div className="kpi-meta-new">Loyal customer orders</div>
                </div>

                {/* Categories (White) */}
                <div className="kpi-card-new white">
                    <div>
                        <div className="kpi-icon-box"><FiPackage /></div>
                        <div className="kpi-label-new" style={{ color: '#f59e0b' }}>CATEGORIES</div>
                        <div className="kpi-value-new" style={{ color: '#1e293b' }}>{allCategories.length}</div>
                        <div className="kpi-sub-new" style={{ color: '#64748b' }}>Active product categories</div>
                    </div>
                </div>
            </div>

            <div className="charts-split">
                {/* Orders & Revenue Trend */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Orders & Revenue Trend</h3>
                        <div className="chart-filters">
                            <select className="chart-select" value={chartGroup} onChange={(e) => setChartGroup(e.target.value)}>
                                <option value="day">Daily View</option>
                                <option value="month">Monthly View</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <AreaChart data={overviewChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(value, name) => [name === 'revenue' ? `₹${value}` : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                                />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#colorTrend)" dot={false} activeDot={{ r: 6 }} />
                                <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} fill="none" dot={false} activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div> Revenue (₹)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div> Orders
                        </div>
                    </div>
                </div>

                {/* Orders by Category */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Orders by Category</h3>
                    </div>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={productAnalytics.categoryPerformance.slice(0, 5)}
                                    dataKey="revenue"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                >
                                    {productAnalytics.categoryPerformance.slice(0, 5).map((entry, index) => ( // Top 5 only
                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => `₹${val}`} />
                                <Legend layout="vertical" align="center" verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Products Table */}
            <div className="table-card">
                <div className="chart-header">
                    <h3 className="chart-title">Top Products Performance</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span>
                        <span style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '600' }}>Healthy Life Powders</span>
                    </div>
                </div>
                <div className="products-table-container">
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>PRODUCT</th>
                                <th>CATEGORY</th>
                                <th>QUANTITY SOLD</th>
                                <th style={{ textAlign: 'right' }}>REVENUE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productAnalytics.topProducts.map((p, i) => (
                                <tr key={i} className="product-row">
                                    <td>{p.name}</td>
                                    <td><span className="category-pill">{p.category}</span></td>
                                    <td>{p.quantity}</td>
                                    <td style={{ textAlign: 'right' }} className="price-text">₹{p.revenue.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
