const orderModel = require("../../models/orderSchema")
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const loadSalesReportPage = async (req, res) => {
    try {
        let query = {}; 
        const now = new Date();

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
        const { salesData, overallData } = req.body;


        if (!salesData || salesData.length === 0) {
            return res.status(400).send("No sales data available.");
        }

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

        doc.pipe(res);

        doc.fontSize(20).text('SOFASCAPE', { align: 'center', underline: true });
        doc.moveDown(1);
        doc.fontSize(16).text('Sales Report', { align: 'center' });
        doc.moveDown(2);

        const tableHeaders = ['Date', 'Order Count', 'Total Sales (₹)', 'Discount (₹)', 'Net Sales (₹)'];
        const tableWidths = [100, 80, 100, 100, 100];
        let startX = 50;
        let startY = doc.y;

        doc.font('Helvetica-Bold').fontSize(12);
        let x = startX;
        tableHeaders.forEach((header, index) => {
            doc.text(header, x, startY, { width: tableWidths[index], align: 'center' });
            x += tableWidths[index];
        });

        doc.moveTo(startX, startY + 15).lineTo(550, startY + 15).stroke();
        doc.moveDown(1);

        doc.font('Helvetica').fontSize(10);
        salesData.forEach((item, index) => {
            startY = doc.y + 5;
            x = startX;

            doc.text(item.date || '-', x, startY, { width: tableWidths[0], align: 'center' });
            x += tableWidths[0];

            doc.text(item.orderCount?.toString() || '0', x, startY, { width: tableWidths[1], align: 'center' });
            x += tableWidths[1];

            doc.text(`₹${parseFloat(item.totalSales || 0).toLocaleString()}`, x, startY, { width: tableWidths[2], align: 'center' });
            x += tableWidths[2];

            doc.text(`₹${parseFloat(item.discount || 0).toLocaleString()}`, x, startY, { width: tableWidths[3], align: 'center' });
            x += tableWidths[3];

            doc.text(`₹${parseFloat(item.netSales || 0).toLocaleString()}`, x, startY, { width: tableWidths[4], align: 'center' });
            x += tableWidths[4];

            doc.moveTo(startX, startY + 15).lineTo(550, startY + 15).stroke();
            doc.moveDown(1);

            if (doc.y > 700) {
                doc.addPage();
                startY = 50;
            }
        });

        doc.moveDown(2);
        doc.fontSize(14).font('Helvetica-Bold').text('Overall Summary', { underline: true });
        doc.moveDown(1);

        doc.fontSize(12).font('Helvetica');
        doc.text(`Total Orders: ${overallData.overallOrderCount}`);
        doc.text(`Total Sales: ₹${parseFloat(overallData.overallTotalSales).toLocaleString()}`);
        doc.text(`Total Discount: ₹${parseFloat(overallData.overallTotalDiscount).toLocaleString()}`);
        doc.text(`Net Sales: ₹${parseFloat(overallData.overallNetSales).toLocaleString()}`);

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF.');
    }
};


const downloadExcel = async (req, res) => {
    try {
        const { salesData, overallData } = req.body;
        console.log('Received Overall Data:', overallData);

        if (!Array.isArray(salesData) || salesData.length === 0) {
            return res.status(400).send('No sales data available');
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Order Count', key: 'orderCount', width: 15 },
            { header: 'Total Sales', key: 'totalSales', width: 20 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Net Sales', key: 'netSales', width: 20 }
        ];

        worksheet.getCell('C1').value = 'Sofascapes';
        worksheet.getCell('C1').font = { bold: true, size: 14 };

        let rowStartIndex = 4;
        salesData.forEach((item, index) => {
            worksheet.addRow({
                date: item.Date || item.date,
                orderCount: item['Order Count'] || item.orderCount,
                totalSales: item['Total Sales'] || item.totalSales,
                discount: item['Discount'] || item.discount,
                netSales: item['Net Sales'] || item.netSales,
            });
        });

        worksheet.addRow([]);

        if (overallData && overallData.overallOrderCount !== undefined) {
            console.log('Final Overall Data:', overallData);
            worksheet.addRow({
                date: 'Overall',
                orderCount: overallData.overallOrderCount,
                totalSales: overallData.overallTotalSales,
                discount: overallData.overallTotalDiscount,
                netSales: overallData.overallNetSales
            });
        } else {
            console.error('Overall data is missing or invalid');
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).send('Error generating Excel.');
    }
};





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

        // Calculate overall totals
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

        res.json({
            dailyReport: formattedReport,
            overallOrderCount,
            overallTotalSales,
            overallTotalDiscount,
            overallNetSales
        });
    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).json({ error: "Server error" });
    }
};





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


const loadSalesDetails = async (req, res) => {
    const { date } = req.params;
    try {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999); 

        let orders = await orderModel.find({
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean(); 

        const productIds = orders.flatMap(order =>
            order.products.map(product => product.productId)
        );
        let totalOrder=orders.length;
        const netSales = orders.reduce((sum, order) => sum + order.total, 0); 

        console.log("order IDs:", netSales);
        console.log("Product IDs:", productIds);

        res.render('salesDetails', { orders, productIds ,totalOrder,netSales,date}); 
    } catch (error) {
        console.error("Error fetching sales details:", error);
        res.status(500).send("Server Error");
    }
};


module.exports = {
    loadSalesReportPage,
    downloadPDF,
    downloadExcel,
    filter,
    loadDashboard,
    getSalesData,
    loadSalesDetails   
}