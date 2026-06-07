package com.orderflow.product.config;

import com.orderflow.product.domain.Category;
import com.orderflow.product.domain.Product;
import com.orderflow.product.repository.CategoryRepository;
import com.orderflow.product.repository.ProductRepository;
import java.math.BigDecimal;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "orderflow.catalog.seed.enabled", havingValue = "true", matchIfMissing = true)
public class SampleProductCatalogInitializer implements ApplicationRunner {

    private static final List<CategorySeed> CATEGORY_SEEDS = List.of(
            new CategorySeed("electronics", "Electronics"),
            new CategorySeed("computers-accessories", "Computers & Accessories"),
            new CategorySeed("home-kitchen", "Home & Kitchen"),
            new CategorySeed("grocery-gourmet", "Grocery & Gourmet"),
            new CategorySeed("fashion", "Fashion"),
            new CategorySeed("beauty-personal-care", "Beauty & Personal Care"),
            new CategorySeed("sports-outdoors", "Sports & Outdoors"),
            new CategorySeed("toys-games", "Toys & Games"),
            new CategorySeed("books-stationery", "Books & Stationery"),
            new CategorySeed("pet-supplies", "Pet Supplies"));

    private static final Map<String, String> CATEGORY_NAME_TO_CODE = CATEGORY_SEEDS.stream()
            .collect(Collectors.toMap(
                    seed -> normalize(seed.name()),
                    CategorySeed::code,
                    (left, right) -> left,
                    LinkedHashMap::new));

    private static final List<SeedProduct> SAMPLE_PRODUCTS = List.of(
            new SeedProduct("electronics", "Nova X5 Smartphone", "6.7-inch OLED smartphone with all-day battery life and fast charging.", "699.00", 48),
            new SeedProduct("electronics", "Pulse ANC Headphones", "Wireless over-ear headphones with adaptive noise cancellation and deep bass.", "179.00", 35),
            new SeedProduct("electronics", "Ember Mini Soundbar", "Compact soundbar that adds clearer dialogue and richer TV audio.", "129.00", 26),
            new SeedProduct("electronics", "Orion Smartwatch", "Fitness-focused smartwatch with sleep tracking and message notifications.", "249.00", 32),
            new SeedProduct("electronics", "Halo Mesh Router Kit", "Dual-node Wi-Fi mesh router kit for reliable whole-home coverage.", "219.00", 18),

            new SeedProduct("computers-accessories", "Atlas 14 Laptop", "Lightweight 14-inch laptop for work, browsing, and travel.", "999.00", 16),
            new SeedProduct("computers-accessories", "Vector Mechanical Keyboard", "Tactile wireless keyboard with low-profile switches and backlighting.", "109.00", 42),
            new SeedProduct("computers-accessories", "PixelView 27 Monitor", "27-inch QHD monitor with slim bezels and color-accurate panel.", "289.00", 21),
            new SeedProduct("computers-accessories", "Glide Wireless Mouse", "Ergonomic mouse with silent clicks and multi-device pairing.", "39.00", 67),
            new SeedProduct("computers-accessories", "DockHub USB-C Station", "Single-cable dock with HDMI, Ethernet, and fast device charging.", "149.00", 28),

            new SeedProduct("home-kitchen", "Aero Fry Digital Oven", "Countertop air fryer oven with preset cooking programs and easy-clean basket.", "159.00", 20),
            new SeedProduct("home-kitchen", "Stoneware Cookware Set", "10-piece nonstick cookware set for daily stovetop cooking.", "189.00", 24),
            new SeedProduct("home-kitchen", "PureBrew Coffee Maker", "Programmable drip coffee maker with thermal carafe.", "89.00", 37),
            new SeedProduct("home-kitchen", "CloudRest Memory Pillow", "Cooling memory foam pillow designed for side and back sleepers.", "49.00", 58),
            new SeedProduct("home-kitchen", "Lumi Desk Lamp", "Minimal LED desk lamp with touch dimming and USB charging base.", "59.00", 44),

            new SeedProduct("grocery-gourmet", "Summit Trail Mix Pack", "Resealable trail mix blend with roasted nuts, berries, and dark chocolate.", "14.00", 72),
            new SeedProduct("grocery-gourmet", "Velvet Roast Coffee Beans", "Medium roast whole beans with cocoa and caramel notes.", "18.00", 65),
            new SeedProduct("grocery-gourmet", "Orchard Honey Jar", "Raw wildflower honey for breakfast, baking, and tea.", "12.00", 41),
            new SeedProduct("grocery-gourmet", "Harvest Olive Oil", "Cold-pressed extra virgin olive oil for finishing and cooking.", "22.00", 39),
            new SeedProduct("grocery-gourmet", "Coastal Granola Box", "Crunchy oat granola with seeds, almonds, and dried fruit.", "11.00", 54),

            new SeedProduct("fashion", "Metro Everyday Sneakers", "Comfort-first sneakers built for daily city wear.", "84.00", 33),
            new SeedProduct("fashion", "Northline Denim Jacket", "Classic denim layer with a relaxed silhouette and durable finish.", "96.00", 17),
            new SeedProduct("fashion", "Harbor Canvas Tote", "Structured canvas tote for commuting, shopping, and weekend errands.", "42.00", 49),
            new SeedProduct("fashion", "Cedar Linen Shirt", "Breathable linen shirt with a clean casual fit.", "58.00", 27),
            new SeedProduct("fashion", "Arc Sport Cap", "Adjustable everyday cap with moisture-wicking inner band.", "24.00", 61),

            new SeedProduct("beauty-personal-care", "Radiant Vitamin C Serum", "Brightening serum for daily skincare routines.", "29.00", 46),
            new SeedProduct("beauty-personal-care", "Silk Repair Shampoo", "Sulfate-free shampoo formulated for dry and damaged hair.", "19.00", 53),
            new SeedProduct("beauty-personal-care", "CalmWave Facial Cleanser", "Gentle gel cleanser that removes oil without stripping skin.", "17.00", 57),
            new SeedProduct("beauty-personal-care", "Daily Shield SPF 50", "Lightweight broad-spectrum sunscreen for daily wear.", "21.00", 45),
            new SeedProduct("beauty-personal-care", "Velvet Hand Cream", "Fast-absorbing hand cream with shea butter and vitamin E.", "13.00", 68),

            new SeedProduct("sports-outdoors", "Apex Yoga Mat", "Non-slip yoga mat with extra cushioning for floor workouts.", "34.00", 50),
            new SeedProduct("sports-outdoors", "Summit Trekking Pole Set", "Adjustable trekking poles designed for day hikes and travel.", "64.00", 22),
            new SeedProduct("sports-outdoors", "CoreFlex Dumbbell Pair", "Adjustable dumbbell pair for compact home strength training.", "199.00", 14),
            new SeedProduct("sports-outdoors", "TrailLite Camping Lantern", "Rechargeable lantern with warm light and emergency power bank mode.", "39.00", 31),
            new SeedProduct("sports-outdoors", "SwiftRide Cycling Helmet", "Ventilated helmet with adjustable fit system for road or trail rides.", "74.00", 19),

            new SeedProduct("toys-games", "Rocket Builder Blocks", "Creative building block set with color-sorted storage box.", "28.00", 47),
            new SeedProduct("toys-games", "Quest Family Board Game", "Strategy board game built for family game nights.", "36.00", 29),
            new SeedProduct("toys-games", "Logic Maze Puzzle Set", "Progressive puzzle set that builds problem-solving skills.", "22.00", 38),
            new SeedProduct("toys-games", "Astro Remote Car", "Rechargeable remote-control car with indoor-safe speed modes.", "44.00", 25),
            new SeedProduct("toys-games", "Storytime Plush Bear", "Soft collectible plush toy designed for younger children.", "18.00", 52),

            new SeedProduct("books-stationery", "Focus Planner Pro", "Undated weekly planner with goals, notes, and habit tracking pages.", "26.00", 43),
            new SeedProduct("books-stationery", "InkFlow Gel Pen Set", "Smooth-writing gel pen set with archival-quality ink.", "16.00", 64),
            new SeedProduct("books-stationery", "Deep Work Notebook", "Hardcover notebook with dotted pages for planning and journaling.", "14.00", 59),
            new SeedProduct("books-stationery", "BrightMind Highlighter Pack", "Muted-color highlighter pack for study and work notes.", "9.00", 71),
            new SeedProduct("books-stationery", "DeskGrid Weekly Pad", "Tear-off desk pad for weekly priorities and meeting planning.", "12.00", 55),

            new SeedProduct("pet-supplies", "TailTrail Dog Leash", "Durable walking leash with padded handle and reflective trim.", "21.00", 36),
            new SeedProduct("pet-supplies", "CozyPaws Pet Bed", "Machine-washable pet bed with raised cushioning edges.", "49.00", 23),
            new SeedProduct("pet-supplies", "WhiskerFresh Litter Mat", "Easy-clean litter mat that traps debris outside the tray.", "19.00", 42),
            new SeedProduct("pet-supplies", "FetchPro Chew Toy Set", "Multi-piece chew toy set for active dogs and puppies.", "17.00", 48),
            new SeedProduct("pet-supplies", "PureBowl Pet Feeder", "Stainless steel feeder set with anti-slip silicone base.", "27.00", 34));

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        upsertCategories();
        categoryRepository.flush();
        backfillCategoryCodes();
        seedMissingProducts();
    }

    private void upsertCategories() {
        Map<String, Category> existingCategories = categoryRepository.findAll()
                .stream()
                .collect(Collectors.toMap(
                        Category::getCode,
                        category -> category,
                        (left, right) -> left,
                        LinkedHashMap::new));

        int inserts = 0;
        int updates = 0;

        for (CategorySeed seed : CATEGORY_SEEDS) {
            Category category = existingCategories.get(seed.code());
            if (category == null) {
                categoryRepository.save(Category.builder()
                        .code(seed.code())
                        .name(seed.name())
                        .active(true)
                        .build());
                inserts++;
                continue;
            }

            boolean changed = false;
            if (!seed.name().equals(category.getName())) {
                category.setName(seed.name());
                changed = true;
            }
            if (!Boolean.TRUE.equals(category.getActive())) {
                category.setActive(true);
                changed = true;
            }

            if (changed) {
                categoryRepository.save(category);
                updates++;
            }
        }

        log.info("Category seed completed inserted={} updated={} totalDefinitions={}", inserts, updates, CATEGORY_SEEDS.size());
    }

    private void backfillCategoryCodes() {
        if (!legacyCategoryColumnExists()) {
            return;
        }

        List<LegacyProductRow> rows = jdbcTemplate.query(
                """
                select id, category, name, description
                from products
                where category_code is null
                """,
                (resultSet, rowNum) -> mapLegacyRow(resultSet));

        if (rows.isEmpty()) {
            return;
        }

        for (LegacyProductRow row : rows) {
            jdbcTemplate.update(
                    "update products set category_code = ? where id = ?",
                    resolveCategoryCode(row.legacyCategory(), row.name(), row.description(), row.id()),
                    row.id());
        }

        log.info("Backfilled category_code for {} existing products", rows.size());
    }

    private boolean legacyCategoryColumnExists() {
        return Boolean.TRUE.equals(jdbcTemplate.execute((ConnectionCallback<Boolean>) connection -> {
            DatabaseMetaData metaData = connection.getMetaData();
            return columnExists(metaData, "products", "category")
                    || columnExists(metaData, "PRODUCTS", "CATEGORY");
        }));
    }

    private boolean columnExists(DatabaseMetaData metaData, String tableName, String columnName) throws SQLException {
        try (ResultSet columns = metaData.getColumns(null, null, tableName, columnName)) {
            return columns.next();
        }
    }

    private LegacyProductRow mapLegacyRow(ResultSet resultSet) throws SQLException {
        return new LegacyProductRow(
                resultSet.getLong("id"),
                resultSet.getString("category"),
                resultSet.getString("name"),
                resultSet.getString("description"));
    }

    private void seedMissingProducts() {
        Set<String> existingNames = productRepository.findAll()
                .stream()
                .map(Product::getName)
                .filter(name -> name != null && !name.isBlank())
                .map(SampleProductCatalogInitializer::normalize)
                .collect(Collectors.toSet());

        List<Product> productsToInsert = SAMPLE_PRODUCTS.stream()
                .filter(sample -> !existingNames.contains(normalize(sample.name())))
                .map(this::toEntity)
                .toList();

        if (productsToInsert.isEmpty()) {
            log.info("Sample product catalog already loaded with {} categories", CATEGORY_SEEDS.size());
            return;
        }

        productRepository.saveAll(productsToInsert);
        log.info("Inserted {} sample products across {} categories", productsToInsert.size(), CATEGORY_SEEDS.size());
    }

    private Product toEntity(SeedProduct sample) {
        return Product.builder()
                .name(sample.name())
                .category(categoryRepository.getReferenceById(sample.categoryCode()))
                .description(sample.description())
                .price(new BigDecimal(sample.price()))
                .stockQuantity(sample.stockQuantity())
                .active(true)
                .build();
    }

    private String resolveCategoryCode(String legacyCategory, String name, String description, Long productId) {
        String normalizedLegacyCategory = normalize(legacyCategory);
        if (!normalizedLegacyCategory.isBlank()) {
            String matchedCode = CATEGORY_NAME_TO_CODE.get(normalizedLegacyCategory);
            if (matchedCode != null) {
                return matchedCode;
            }
        }

        String searchableText = normalize(name + " " + description);

        if (containsAny(searchableText, "laptop", "keyboard", "monitor", "mouse", "dock", "usb-c")) {
            return "computers-accessories";
        }
        if (containsAny(searchableText, "phone", "headphone", "soundbar", "smartwatch", "router", "speaker")) {
            return "electronics";
        }
        if (containsAny(searchableText, "cook", "coffee", "pillow", "lamp", "kitchen", "oven", "air fryer")) {
            return "home-kitchen";
        }
        if (containsAny(searchableText, "coffee beans", "granola", "honey", "olive oil", "trail mix")) {
            return "grocery-gourmet";
        }
        if (containsAny(searchableText, "shirt", "jacket", "sneaker", "tote", "cap")) {
            return "fashion";
        }
        if (containsAny(searchableText, "serum", "shampoo", "cleanser", "sunscreen", "cream")) {
            return "beauty-personal-care";
        }
        if (containsAny(searchableText, "yoga", "dumbbell", "trek", "camp", "helmet", "cycling")) {
            return "sports-outdoors";
        }
        if (containsAny(searchableText, "game", "puzzle", "plush", "blocks", "remote car")) {
            return "toys-games";
        }
        if (containsAny(searchableText, "planner", "pen", "notebook", "highlighter", "desk pad", "book")) {
            return "books-stationery";
        }
        if (containsAny(searchableText, "pet", "dog", "cat", "litter", "leash", "feeder")) {
            return "pet-supplies";
        }

        int categoryIndex = productId == null ? 0 : Math.floorMod(productId.intValue() - 1, CATEGORY_SEEDS.size());
        return CATEGORY_SEEDS.get(categoryIndex).code();
    }

    private boolean containsAny(String source, String... candidates) {
        for (String candidate : candidates) {
            if (source.contains(candidate)) {
                return true;
            }
        }
        return false;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private record CategorySeed(String code, String name) {
    }

    private record SeedProduct(
            String categoryCode,
            String name,
            String description,
            String price,
            int stockQuantity) {
    }

    private record LegacyProductRow(
            Long id,
            String legacyCategory,
            String name,
            String description) {
    }
}
