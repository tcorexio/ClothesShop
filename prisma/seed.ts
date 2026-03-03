import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

async function main() {
    // When running locally, replace Docker hostname 'postgres' with 'localhost'
    const dbUrl = (process.env.DATABASE_URL || '').replace('@postgres:', '@localhost:');
    const adapter = new PrismaPg({ connectionString: dbUrl });
    const prisma = new PrismaClient({ adapter });

    console.log('Seeding database...');

    const passwordHash = await bcrypt.hash('Test@1234', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@clothesshop.com' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@clothesshop.com',
            password: passwordHash,
            name: 'Admin',
            role: 'ADMIN',
        },
    });

    const customer1 = await prisma.user.upsert({
        where: { email: 'nguyen@example.com' },
        update: {},
        create: {
            username: 'nguyenvan',
            email: 'nguyen@example.com',
            password: passwordHash,
            name: 'Nguyen Van A',
            phone: '0901111111',
            role: 'CUSTOMER',
        },
    });

    const customer2 = await prisma.user.upsert({
        where: { email: 'tran@example.com' },
        update: {},
        create: {
            username: 'tranle',
            email: 'tran@example.com',
            password: passwordHash,
            name: 'Tran Thi B',
            phone: '0902222222',
            role: 'CUSTOMER',
        },
    });

    const catAo = await prisma.category.upsert({ where: { id: 1 }, update: {}, create: { title: 'Ao' } });
    const catQuan = await prisma.category.upsert({ where: { id: 2 }, update: {}, create: { title: 'Quan' } });
    const catPhu = await prisma.category.upsert({ where: { id: 3 }, update: {}, create: { title: 'Phu kien' } });

    // Low prices to test PayOS without spending real money
    const p1 = await prisma.product.upsert({
        where: { id: 1 },
        update: { price: 1000 },
        create: { name: 'Ao Thun Basic', description: 'Ao thun cotton thoang mat', price: 1000, categoryId: catAo.id },
    });
    const p2 = await prisma.product.upsert({
        where: { id: 2 },
        update: { price: 2000 },
        create: { name: 'Ao Polo Classic', description: 'Ao polo lich su, phu hop di lam', price: 2000, categoryId: catAo.id },
    });
    const p3 = await prisma.product.upsert({
        where: { id: 3 },
        update: { price: 1000 },
        create: { name: 'Quan Jean Slim Fit', description: 'Quan jean co gian tot', price: 1000, categoryId: catQuan.id },
    });
    const p4 = await prisma.product.upsert({
        where: { id: 4 },
        update: { price: 2000 },
        create: { name: 'Quan Kaki Chinos', description: 'Quan kaki thoi trang', price: 2000, categoryId: catQuan.id },
    });
    const p5 = await prisma.product.upsert({
        where: { id: 5 },
        update: { price: 1000 },
        create: { name: 'Mu Luoi Trai', description: 'Mu the thao nang dong', price: 1000, categoryId: catPhu.id },
    });

    const v1 = await prisma.productVariant.upsert({
        where: { productId_size_color: { productId: p1.id, size: 'M', color: 'Trang' } },
        update: { stock: 100 },
        create: { productId: p1.id, size: 'M', color: 'Trang', stock: 100 },
    });
    const v2 = await prisma.productVariant.upsert({
        where: { productId_size_color: { productId: p1.id, size: 'L', color: 'Den' } },
        update: { stock: 80 },
        create: { productId: p1.id, size: 'L', color: 'Den', stock: 80 },
    });
    const v3 = await prisma.productVariant.upsert({
        where: { productId_size_color: { productId: p2.id, size: 'M', color: 'Xanh navy' } },
        update: { stock: 60 },
        create: { productId: p2.id, size: 'M', color: 'Xanh navy', stock: 60 },
    });
    const v4 = await prisma.productVariant.upsert({
        where: { productId_size_color: { productId: p3.id, size: '32', color: 'Xanh dam' } },
        update: { stock: 50 },
        create: { productId: p3.id, size: '32', color: 'Xanh dam', stock: 50 },
    });
    const v5 = await prisma.productVariant.upsert({
        where: { productId_size_color: { productId: p4.id, size: '32', color: 'Be' } },
        update: { stock: 70 },
        create: { productId: p4.id, size: '32', color: 'Be', stock: 70 },
    });
    const v6 = await prisma.productVariant.upsert({
        where: { productId_size_color: { productId: p5.id, size: 'Free', color: 'Den' } },
        update: { stock: 200 },
        create: { productId: p5.id, size: 'Free', color: 'Den', stock: 200 },
    });

    // Helper to quickly create a shipping address snapshot for each order
    async function createOrderAddress(name: string) {
        return prisma.orderAddress.create({
            data: { fullName: name, phone: '0909123456', street: '100 Le Loi', city: 'Ho Chi Minh' },
        });
    }

    // 4 DELIVERED orders — used to test revenue statistics
    const oa1 = await createOrderAddress(customer1.name!);
    const order1 = await prisma.order.create({
        data: { userId: customer1.id, orderAddressId: oa1.id, totalPrice: 4000, status: 'DELIVERED', createdAt: new Date('2026-01-10') },
    });
    await prisma.orderItem.createMany({
        data: [
            { orderId: order1.id, variantId: v1.id, quantity: 2, productName: p1.name, variantSize: 'M', variantColor: 'Trang', price: 1000 },
            { orderId: order1.id, variantId: v3.id, quantity: 1, productName: p2.name, variantSize: 'M', variantColor: 'Xanh navy', price: 2000 },
        ]
    });
    await prisma.payment.create({ data: { orderId: order1.id, method: 'BANK_TRANSFER', status: 'PAID', amount: 4000, paidAt: new Date('2026-01-11') } });

    const oa2 = await createOrderAddress(customer2.name!);
    const order2 = await prisma.order.create({
        data: { userId: customer2.id, orderAddressId: oa2.id, totalPrice: 2000, status: 'DELIVERED', createdAt: new Date('2026-01-15') },
    });
    await prisma.orderItem.createMany({
        data: [
            { orderId: order2.id, variantId: v4.id, quantity: 2, productName: p3.name, variantSize: '32', variantColor: 'Xanh dam', price: 1000 },
        ]
    });
    await prisma.payment.create({ data: { orderId: order2.id, method: 'COD', status: 'PAID', amount: 2000, paidAt: new Date('2026-01-15') } });

    const oa3 = await createOrderAddress(customer1.name!);
    const order3 = await prisma.order.create({
        data: { userId: customer1.id, orderAddressId: oa3.id, totalPrice: 5000, status: 'DELIVERED', createdAt: new Date('2026-02-05') },
    });
    await prisma.orderItem.createMany({
        data: [
            { orderId: order3.id, variantId: v1.id, quantity: 1, productName: p1.name, variantSize: 'M', variantColor: 'Trang', price: 1000 },
            { orderId: order3.id, variantId: v4.id, quantity: 1, productName: p3.name, variantSize: '32', variantColor: 'Xanh dam', price: 1000 },
            { orderId: order3.id, variantId: v5.id, quantity: 1, productName: p4.name, variantSize: '32', variantColor: 'Be', price: 2000 },
            { orderId: order3.id, variantId: v6.id, quantity: 1, productName: p5.name, variantSize: 'Free', variantColor: 'Den', price: 1000 },
        ]
    });
    await prisma.payment.create({ data: { orderId: order3.id, method: 'BANK_TRANSFER', status: 'PAID', amount: 5000, paidAt: new Date('2026-02-06') } });

    const oa4 = await createOrderAddress(customer2.name!);
    const order4 = await prisma.order.create({
        data: { userId: customer2.id, orderAddressId: oa4.id, totalPrice: 4000, status: 'DELIVERED', createdAt: new Date('2026-02-20') },
    });
    await prisma.orderItem.createMany({
        data: [
            { orderId: order4.id, variantId: v3.id, quantity: 2, productName: p2.name, variantSize: 'M', variantColor: 'Xanh navy', price: 2000 },
        ]
    });
    await prisma.payment.create({ data: { orderId: order4.id, method: 'COD', status: 'PAID', amount: 4000, paidAt: new Date('2026-02-20') } });

    // Other orders with different statuses to test order statistics
    const oa5 = await createOrderAddress(customer1.name!);
    const order5 = await prisma.order.create({
        data: { userId: customer1.id, orderAddressId: oa5.id, totalPrice: 2000, status: 'SHIPPED', createdAt: new Date('2026-02-24') },
    });
    await prisma.orderItem.createMany({
        data: [
            { orderId: order5.id, variantId: v5.id, quantity: 1, productName: p4.name, variantSize: '32', variantColor: 'Be', price: 2000 },
        ]
    });
    await prisma.payment.create({ data: { orderId: order5.id, method: 'COD', status: 'PENDING', amount: 2000 } });

    const oa6 = await createOrderAddress(customer2.name!);
    const order6 = await prisma.order.create({
        data: { userId: customer2.id, orderAddressId: oa6.id, totalPrice: 3000, status: 'PROCESSED', createdAt: new Date('2026-02-25') },
    });
    await prisma.orderItem.createMany({
        data: [
            { orderId: order6.id, variantId: v2.id, quantity: 1, productName: p1.name, variantSize: 'L', variantColor: 'Den', price: 1000 },
            { orderId: order6.id, variantId: v6.id, quantity: 2, productName: p5.name, variantSize: 'Free', variantColor: 'Den', price: 1000 },
        ]
    });
    await prisma.payment.create({ data: { orderId: order6.id, method: 'BANK_TRANSFER', status: 'PAID', amount: 3000, paidAt: new Date('2026-02-25') } });

    const oa7 = await createOrderAddress(customer1.name!);
    const order7 = await prisma.order.create({
        data: { userId: customer1.id, orderAddressId: oa7.id, totalPrice: 1000, status: 'CANCELLED', createdAt: new Date('2026-01-20') },
    });
    await prisma.orderItem.createMany({
        data: [
            { orderId: order7.id, variantId: v1.id, quantity: 1, productName: p1.name, variantSize: 'M', variantColor: 'Trang', price: 1000 },
        ]
    });
    await prisma.payment.create({ data: { orderId: order7.id, method: 'COD', status: 'FAILED', amount: 1000 } });

    const oa8 = await createOrderAddress(customer2.name!);
    const order8 = await prisma.order.create({
        data: { userId: customer2.id, orderAddressId: oa8.id, totalPrice: 2000, status: 'PENDING', createdAt: new Date('2026-02-27') },
    });
    await prisma.orderItem.createMany({
        data: [
            { orderId: order8.id, variantId: v4.id, quantity: 1, productName: p3.name, variantSize: '32', variantColor: 'Xanh dam', price: 1000 },
            { orderId: order8.id, variantId: v6.id, quantity: 1, productName: p5.name, variantSize: 'Free', variantColor: 'Den', price: 1000 },
        ]
    });
    await prisma.payment.create({ data: { orderId: order8.id, method: 'BANK_TRANSFER', status: 'PENDING', amount: 2000 } });

    console.log('Seed done.');
    console.log('  admin    / Test@1234');
    console.log('  nguyenvan / Test@1234');
    console.log('  tranle    / Test@1234');


    await prisma.$disconnect();
}

main().catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
});
