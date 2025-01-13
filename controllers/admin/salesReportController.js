const orderModel = require("../../models/orderSchema")
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

const loadSalesReportPage = async (req, res) => {
    const { specificDay, quickRange, fromDate, toDate } = req.body;
    try {
        let query = {};
        const now = new Date();


        if (specificDay) {
            const startOfDay = new Date(specificDay);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(specificDay);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        if (quickRange === '1day') {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            query.createdAt = { $gte: yesterday, $lte: now };
        } else if (quickRange === '1week') {
            const lastWeek = new Date(now);
            lastWeek.setDate(now.getDate() - 7);
            query.createdAt = { $gte: lastWeek, $lte: now };
        } else if (quickRange === '1month') {
            const lastMonth = new Date(now);
            lastMonth.setMonth(now.getMonth() - 1);
            query.createdAt = { $gte: lastMonth, $lte: now };
        }

        if (fromDate && toDate) {
            const startDate = new Date(fromDate);
            const endDate = new Date(toDate);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        const dailyReport = await orderModel.aggregate([
            { $match: query },
            { $unwind: "$products" },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        orderId: "$_id"
                    },
                    totalProductsPrice: {
                        $sum: { $multiply: ["$products.price", "$products.quantity"] }
                    },
                    shippingCost: { $first: "$shippingCost" },
                    total: { $first: "$total" }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    totalOrders: { $sum: 1 },
                    totalAmount: {
                        $sum: { $add: ["$totalProductsPrice", "$shippingCost"] }
                    },
                    totalDiscount: {
                        $sum: {
                            $subtract: [
                                { $add: ["$totalProductsPrice", "$shippingCost"] },
                                "$total"
                            ]
                        }
                    },
                    netSales: {
                        $sum: "$total"
                    }
                }
            },
            { $sort: { _id: -1 } }
        ]);


        const overallOrderCount = dailyReport.reduce((sum, report) => sum + report.totalOrders, 0);
        const overallTotalSales = dailyReport.reduce((sum, report) => sum + report.totalAmount, 0);
        const overallTotalDiscount = dailyReport.reduce((sum, report) => sum + report.totalDiscount, 0);
        const overallNetSales = dailyReport.reduce((sum, report) => sum + report.netSales, 0);


        const formattedReport = dailyReport.map(report => ({
            ...report,
            date: new Date(report._id).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            })
        }));

        res.render("salesReportManagement", {
            dailyReport: formattedReport,
            overallOrderCount,
            overallTotalSales,
            overallTotalDiscount,
            overallNetSales,
            formatNumber: (number) => number.toLocaleString()
        });
    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).send("Internal Server Error");
    }
};

const downloadPDF = async (req, res) => {
    try {
        const { salesData } = req.body;

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

        doc.fontSize(16).text('Sales Report', { align: 'center' });
        doc.moveDown(1);

        const tableHeaders = ['Date', 'Order Count', 'Total Sales', 'Discount', 'Net Sales'];
        const tableWidths = [100, 80, 100, 100, 100];

        let x = 50;
        let y = doc.y;

        y = 100;

        doc.fontSize(12).font('Helvetica-Bold');
        tableHeaders.forEach((header, index) => {
            doc.text(header, x, y, { width: tableWidths[index], align: 'center' });
            x += tableWidths[index];
        });

        x = 50;
        tableHeaders.forEach((_, index) => {
            doc.rect(x, y - 10, tableWidths[index], 20).stroke();
            x += tableWidths[index];
        });

        doc.moveDown(0.2);
        y = doc.y;

        doc.fontSize(10).font('Helvetica');
        salesData.forEach(item => {
            x = 50;
            const rowY = y;

            doc.text(item.date, x, rowY, { width: tableWidths[0], align: 'center' });
            x += tableWidths[0];

            doc.text(item.orderCount, x, rowY, { width: tableWidths[1], align: 'center' });
            x += tableWidths[1];

            doc.text(item.totalSales, x, rowY, { width: tableWidths[2], align: 'center' });
            x += tableWidths[2];

            doc.text(item.discount, x, rowY, { width: tableWidths[3], align: 'center' });
            x += tableWidths[3];

            doc.text(item.netSales, x, rowY, { width: tableWidths[4], align: 'center' });
            x += tableWidths[4];

            x = 50;
            tableHeaders.forEach((_, index) => {
                doc.rect(x, rowY - 5, tableWidths[index], 20).stroke();
                x += tableWidths[index];
            });

            y = rowY + 20;
        });

        doc.end();
        doc.pipe(res);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF.');
    }

}

const downloadExel = async (req, res) => {
    try {
        const { salesData } = req.body;

        if (!Array.isArray(salesData) || salesData.length === 0) {
            return res.status(400).send('No sales data available');
        }

        const wb = XLSX.utils.book_new();

        const ws = XLSX.utils.json_to_sheet(salesData, {
            header: ['date', 'orderCount', 'totalSales', 'discount', 'netSales'],
        });

        XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        const excelFile = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

        res.send(excelFile);
        res.end();

    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).send('Error generating Excel.');
    }

}

const filter = async (req, res) => {
    const { specificDay, quickRange, fromDate, toDate } = req.body;
    try {
        let query = {};
        const now = new Date();

        if (specificDay) {
            const startOfDay = new Date(specificDay);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(specificDay);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        if (quickRange === '1day') {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            query.createdAt = { $gte: yesterday, $lte: now };
        } else if (quickRange === '1week') {
            const lastWeek = new Date(now);
            lastWeek.setDate(now.getDate() - 7);
            query.createdAt = { $gte: lastWeek, $lte: now };
        } else if (quickRange === '1month') {
            const lastMonth = new Date(now);
            lastMonth.setMonth(now.getMonth() - 1);
            query.createdAt = { $gte: lastMonth, $lte: now };
        }

        if (fromDate && toDate) {
            const startDate = new Date(fromDate);
            const endDate = new Date(toDate);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        const dailyReport = await orderModel.aggregate([
            { $match: query },
            { $unwind: "$products" },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        orderId: "$_id"
                    },
                    totalProductsPrice: {
                        $sum: { $multiply: ["$products.price", "$products.quantity"] }
                    },
                    shippingCost: { $first: "$shippingCost" },
                    total: { $first: "$total" }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    totalOrders: { $sum: 1 },
                    totalAmount: {
                        $sum: { $add: ["$totalProductsPrice", "$shippingCost"] }
                    },
                    totalDiscount: {
                        $sum: {
                            $subtract: [
                                { $add: ["$totalProductsPrice", "$shippingCost"] },
                                "$total"
                            ]
                        }
                    },
                    netSales: {
                        $sum: "$total"
                    }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        const formattedReport = dailyReport.map(report => ({
            ...report,
            date: new Date(report._id).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            })
        }));

        res.json({ dailyReport: formattedReport });
    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).json({ error: "Server error" });
    }

}




const loadDashboard = async (req, res) => {
    try {
        const [bestProducts, bestCategories] = await Promise.all([
            orderModel.aggregate(bestSellingProductsPipeline),
            orderModel.aggregate(bestSellingCategoriesPipeline),
        ]);
        
        res.render("dashboard",{bestProducts,bestCategories})
    } catch (error) {
        res.send(error)
    }
}

const getSalesData = async (req, res) => {
    const filter = req.query.filter || 'yearly'; 
    const currentYear = new Date().getFullYear();
    const pipeline = [];

    try {
        if (filter === 'yearly') {
            const startYear = currentYear - 2; 
            const years = [startYear, startYear + 1, startYear + 2];

            pipeline.push(
                {
                    $match: {
                        "products.status": { $nin: ['Cancelled', 'Returned'] }, 
                    },
                },
                {
                    $project: {
                        year: { $year: "$createdAt" },
                        totalPrice: {
                            $sum: {
                                $map: {
                                    input: "$products",
                                    as: "product",
                                    in: {
                                        $multiply: [
                                            "$$product.quantity",
                                            {
                                                $cond: {
                                                    if: { $gt: ["$$product.discountedPrice", 0] },
                                                    then: "$$product.discountedPrice",
                                                    else: "$$product.price",
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                {
                    $group: {
                        _id: "$year", 
                        totalPrice: { $sum: "$totalPrice" },
                    },
                },
                { $sort: { _id: 1 } } 
            );
        } else if (filter === 'monthly') {
            pipeline.push(
                {
                    $match: {
                        createdAt: {
                            $gte: new Date(currentYear, 0, 1),
                            $lt: new Date(currentYear + 1, 0, 1),
                        },
                        "products.status": { $nin: ['Cancelled', 'Returned'] },
                    },
                },
                {
                    $project: {
                        month: { $month: "$createdAt" }, 
                        totalPrice: {
                            $sum: {
                                $map: {
                                    input: "$products",
                                    as: "product",
                                    in: {
                                        $multiply: [
                                            "$$product.quantity",
                                            {
                                                $cond: {
                                                    if: { $gt: ["$$product.discountedPrice", 0] },
                                                    then: "$$product.discountedPrice",
                                                    else: "$$product.price",
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                {
                    $group: {
                        _id: "$month",
                        totalPrice: { $sum: "$totalPrice" },
                    },
                },
                { $sort: { _id: 1 } } 
            );
        } else if (filter === 'weekly') {
            pipeline.push(
                {
                    $match: {
                        "products.status": { $nin: ['Cancelled', 'Returned'] },
                    },
                },
                {
                    $project: {
                        week: { $isoWeek: "$createdAt" },
                        totalPrice: {
                            $sum: {
                                $map: {
                                    input: "$products",
                                    as: "product",
                                    in: {
                                        $multiply: [
                                            "$$product.quantity",
                                            {
                                                $cond: {
                                                    if: { $gt: ["$$product.discountedPrice", 0] },
                                                    then: "$$product.discountedPrice",
                                                    else: "$$product.price",
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                {
                    $group: {
                        _id: "$week",
                        totalPrice: { $sum: "$totalPrice" },
                    },
                },
                { $sort: { _id: 1 } } 
            );
        } else {
            return res.status(400).send('Invalid filter type');
        }

        const orders = await orderModel.aggregate(pipeline);

        const labels = [];
        const totalPrices = [];

        if (filter === 'yearly') {
            const years = [currentYear - 2, currentYear - 1, currentYear];
            const salesData = years.map((year) => {
                const order = orders.find((order) => order._id === year);
                return order ? order.totalPrice : 0; 
            });

            labels.push(...years);
            totalPrices.push(...salesData);
        } else if (filter === 'monthly') {
            const months = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
            ];
            const monthlyData = new Array(12).fill(0);

            orders.forEach((order) => {
                monthlyData[order._id - 1] = order.totalPrice;
            });

            labels.push(...months);
            totalPrices.push(...monthlyData);
        } else if (filter === 'weekly') {
            orders.forEach((order) => {
                labels.push(`Week ${order._id}`);
                totalPrices.push(order.totalPrice);
            });
        }

        res.json({ labels, totalPrices });
    } catch (error) {
        console.error('Error fetching sales data:', error);
        res.status(500).send('Error fetching sales data.');
    }
};

const bestSellingProductsPipeline = [
    { $unwind: "$products" }, 
    {
        $match: {
            "products.status": { $nin: ["Cancelled", "Returned"] }, 
        },
    },
    {
        $group: {
            _id: "$products.productId", 
            totalSold: { $sum: "$products.quantity" }, 
        },
    },
    { $sort: { totalSold: -1 } }, 
    { $limit: 5}, 
    {
        $lookup: {
            from: "products", 
            localField: "_id", 
            foreignField: "_id", 
            as: "productDetails", 
        },
    },
    { $unwind: "$productDetails" }, 
    {
        $project: {
            _id: 1, 
            totalSold: 1, 
            name: "$productDetails.productname", 
            price: "$productDetails.regularprice", 
            discountPrice: "$productDetails.discountPrice", 
            isListed: "$productDetails.isListed", 
        },
    },
];


const bestSellingCategoriesPipeline = [
    { $unwind: { path: "$products", preserveNullAndEmptyArrays: true } },
    {
        $match: {
            $and: [
                { "products.status": { $exists: true } },
                { "products.status": { $nin: ["Cancelled", "Returned"] } },
            ],
        },
    },
    {
        $lookup: {
            from: "products", 
            localField: "products.productId",
            foreignField: "_id",
            as: "productDetails",
        },
    },
    { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: "categories", 
            localField: "productDetails.category",
            foreignField: "_id",
            as: "categoryDetails",
        },
    },
    { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
    {
        $match: {
            "categoryDetails.name": { $exists: true, $ne: null },
        },
    },
    {
        $group: {
            _id: "$categoryDetails.name", 
            totalSold: { $sum: "$products.quantity" },
        },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
    {
        $project: {
            categoryName: "$_id",
            totalSold: 1,
        },
    },
];



module.exports = {
    loadSalesReportPage,
    downloadPDF,
    downloadExel,
    filter,
    loadDashboard,
    getSalesData
   

}