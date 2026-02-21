import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

async function main() {
    // Replace Docker hostname with localhost for running on host machine
    const dbUrl = (process.env.DATABASE_URL || '').replace('@postgres:', '@localhost:');
    const adapter = new PrismaPg({
        connectionString: dbUrl,
    });
    const prisma = new PrismaClient({ adapter });

    console.log('Seeding database:');

    // 1. Create test user
    const passwordHash = await bcrypt.hash('Test@1234', 10);

    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            username: 'testuser',
            email: 'test@example.com',
            password: passwordHash,
            name: 'Nguyen Van Test',
            phone: '0901234567',
            role: 'CUSTOMER',
        },
    });
    console.log(`User created: ${user.username} (id: ${user.id})`);

    // 2. Create address for user
    const address = await prisma.address.upsert({
        where: { id: 1 },
        update: {},
        create: {
            userId: user.id,
            street: '123 Nguyen Trai',
            district: 'Quan 1',
            city: 'Ho Chi Minh',
            phone: '0901234567',
        },
    });
    console.log(`Address created (id: ${address.id})`);

    // 3. Create categories
    const categoryAo = await prisma.category.upsert({
        where: { id: 1 },
        update: {},
        create: { title: 'Áo' },
    });

    const categoryQuan = await prisma.category.upsert({
        where: { id: 2 },
        update: {},
        create: { title: 'Quần' },
    });
    console.log(`Categories created: ${categoryAo.title}, ${categoryQuan.title}`);

    // 4. Create products
    const product1 = await prisma.product.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: 'Áo Thun Basic',
            description: 'Áo thun cotton basic, thoáng mát, dễ phối đồ.',
            price: 150000,
            categoryId: categoryAo.id,
            isActive: true,
        },
    });

    const product2 = await prisma.product.upsert({
        where: { id: 2 },
        update: {},
        create: {
            name: 'Quần Jean Slim Fit',
            description: 'Quần jean slim fit, co giãn tốt.',
            price: 350000,
            categoryId: categoryQuan.id,
            isActive: true,
        },
    });
    console.log(`Products created: ${product1.name}, ${product2.name}`);

    // 5. Create product variants
    const variant1 = await prisma.productVariant.upsert({
        where: { productId_size_color: { productId: product1.id, size: 'M', color: 'Trắng' } },
        update: { stock: 50 },
        create: {
            productId: product1.id,
            size: 'M',
            color: 'Trắng',
            stock: 50,
        },
    });

    const variant2 = await prisma.productVariant.upsert({
        where: { productId_size_color: { productId: product1.id, size: 'L', color: 'Đen' } },
        update: { stock: 30 },
        create: {
            productId: product1.id,
            size: 'L',
            color: 'Đen',
            stock: 30,
        },
    });

    const variant3 = await prisma.productVariant.upsert({
        where: { productId_size_color: { productId: product2.id, size: '32', color: 'Xanh đậm' } },
        update: { stock: 20 },
        create: {
            productId: product2.id,
            size: '32',
            color: 'Xanh đậm',
            stock: 20,
        },
    });
    console.log(`Variants created: ${variant1.id}, ${variant2.id}, ${variant3.id}`);

    // 6. Create cart + cart items for user
    const cart = await prisma.cart.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
    });

    // Clear existing cart items
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    await prisma.cartItem.create({
        data: {
            cartId: cart.id,
            variantId: variant1.id,
            quantity: 2,
        },
    });

    await prisma.cartItem.create({
        data: {
            cartId: cart.id,
            variantId: variant3.id,
            quantity: 1,
        },
    });
    console.log(`Cart created with 2 items (Áo Thun x2, Quần Jean x1)`);

    console.log('\nSeed completed! Summary:');
    console.log(`   User: testuser / Test@1234`);
    console.log(`   Address ID: ${address.id}`);
    console.log(`   Cart: 2x Áo Thun Basic (150,000₫) + 1x Quần Jean (350,000₫)`);
    console.log(`   Total: 650,000₫`);
    console.log('\nNext: Test in Postman');
    console.log('   POST /orders  { "userId": ' + user.id + ', "addressId": ' + address.id + ', "paymentMethod": "BANK_TRANSFER" }');
    console.log('   POST /payments/create-link  { "orderId": <orderId from above> }');

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
});
