# مهمة تطوير شاملة لتطبيق Café Azur

## 1. الهدف العام

أنت تعمل على تطوير تطبيق ويب موجود مسبقًا باسم **Café Azur**، وليس على إنشاء تطبيق جديد من الصفر.

المطلوب هو تحويل التطبيق الحالي من نظام خاص بمحل/مقهى واحد إلى **منصة Multi-Tenant** قادرة على استيعاب عدد كبير من المحلات/المقاهي، مع المحافظة قدر الإمكان على التصميم الحالي والوظائف الحالية وعدم كسر أي ميزة تعمل حاليًا.

التطبيق الحالي مبني أساسًا على:

- Cloudflare Workers
- Cloudflare D1 / SQLite
- Vanilla JavaScript
- HTML/CSS
- Single Page Application
- REST API تحت `/api/*`
- لا توجد حاليًا حاجة إلى React أو Vue أو أي Framework جديد إلا إذا ثبت أن هناك ضرورة تقنية حقيقية.
- الواجهة الأساسية موجودة في `public/index.html`.
- الـBackend الأساسي موجود في `src/index.js`.
- قاعدة البيانات الحالية تحتوي على جداول للمقاهي، التصنيفات، المنتجات، التوفر اليومي، المسؤولين، الجلسات والملفات.
- الصور مخزنة حاليًا داخل D1 في جدول `files`.
- السلة الحالية تعتمد على LocalStorage ولا يتم حاليًا حفظ الطلبات في قاعدة البيانات.

**مهم جدًا:**  
لا تبدأ مباشرة في تعديل الملفات.

ابدأ أولًا بقراءة وفهم المشروع الحالي بالكامل، وخصوصًا:

```text
README.md
src/index.js
public/index.html
wrangler.jsonc
package.json
```

ثم حلل:

1. طريقة المصادقة الحالية.
2. طريقة إنشاء جلسة المستخدم.
3. طريقة تحديد المقهى الحالي.
4. طريقة تحميل القائمة.
5. طريقة إدارة المنتجات.
6. طريقة إدارة التصنيفات.
7. طريقة إدارة التوفر اليومي.
8. طريقة إدارة الصور.
9. طريقة عمل السلة.
10. طريقة Routing الحالية.
11. طريقة ترجمة النصوص.
12. جميع API endpoints الحالية.
13. بنية قاعدة D1 الحالية.
14. جميع العلاقات بين الجداول.
15. طريقة حماية صفحات الإدارة.

بعد ذلك أنشئ خطة تنفيذ داخلية، ثم نفذ التعديلات تدريجيًا.

---

# 2. التحول المطلوب

يجب تحويل التطبيق من:

```text
Single Café
      ↓
Customer
      +
Admin
```

إلى:

```text
                    ┌─────────────────────┐
                    │   System Manager    │
                    │  مدير النظام العام  │
                    └──────────┬──────────┘
                               │
                إنشاء وإدارة المحلات والحسابات
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
     Café A                 Café B                 Café C
        │                      │                      │
   ┌────┴────┐            ┌────┴────┐            ┌────┴────┐
   │         │            │         │            │         │
Customer   Admin       Customer   Admin       Customer   Admin
```

ويضاف حسب نوع الاشتراك:

```text
Type 1:
Customer + Admin

Type 2:
Customer + Admin + Waiter

Type 3:
Customer + Admin + Waiter + Analytics
```

---

# 3. أنواع حسابات المحلات

يجب أن يدعم النظام ثلاثة مستويات/أنواع من المحلات.

## TYPE 1 — Menu Only

المحل من النوع الأول يحصل على:

### واجهة الحريف

- عرض قائمة المنتجات.
- عرض التصنيفات.
- عرض الصور.
- عرض الأسعار.
- عرض المنتجات المتوفرة فقط.
- دعم اللغات الحالية FR / AR / EN.
- دعم التصميم الحالي.
- إمكانية استعمال السلة إذا كانت موجودة حاليًا، لكن **بدون نظام إرسال طلبات فعلي مرتبط بالطاولات**.
- لا توجد خاصية اختيار رقم الطاولة.
- لا توجد واجهة نادل.

### واجهة مشرف المحل

المشرف يستطيع:

- إدارة المنتجات.
- إدارة التصنيفات.
- تغيير توفر المنتجات.
- تغيير الأسعار.
- تغيير الوصف.
- اختيار الصور من مكتبة الصور الداخلية.
- إدارة المظهر.
- إدارة اسم المحل.
- إدارة معلومات المحل.
- إدارة ساعات العمل.
- إدارة اللغات والمحتوى القابل للترجمة حسب النظام الحالي.

---

# 4. TYPE 2 — Orders + Tables + Waiter

هذا النوع هو نظام مطعم/مقهى كامل للطلبات.

يحصل المحل على ثلاث واجهات رئيسية:

```text
1. Customer
2. Admin
3. Waiter
```

## 4.1 Customer Interface

يجب أن يستطيع الحريف:

- الدخول إلى قائمة المحل.
- مشاهدة المنتجات المتوفرة.
- مشاهدة الصور.
- مشاهدة الأسعار.
- اختيار المنتجات.
- تحديد الكمية.
- إضافة المنتجات إلى السلة.
- إرسال الطلب.
- اختيار/معرفة رقم الطاولة.

### نظام الطاولات

كل طاولة يجب أن يكون لها معرف خاص.

مثال:

```text
TABLE-01
TABLE-02
TABLE-03
TABLE-04
...
```

ويجب أن تكون الطاولة مرتبطة بالمحل.

أي أن:

```text
Café A
 ├── Table 01
 ├── Table 02
 ├── Table 03

Café B
 ├── Table 01
 ├── Table 02
```

يمكن أن يكون رقم الطاولة نفسه في محلين مختلفين لأن الـTenant مختلف.

لكن يجب أن يكون هناك معرف داخلي فريد للجدول.

---

# 5. طريقة QR للطاولات

يجب تصميم النظام بحيث يمكن لاحقًا ربط كل طاولة بـQR Code خاص بها.

مثال:

```text
https://domain.com/cafe/cafe-a/table/12
```

أو حسب البنية الأنسب التي يحددها الوكيل بعد دراسة Routing الحالي.

عند دخول الحريف من QR الخاص بالطاولة:

1. يتم التعرف على المحل.
2. يتم التعرف على الطاولة.
3. يتم ربط الطلب بهذه الطاولة.
4. لا يحتاج الحريف إلى تسجيل حساب شخصي.

يجب عدم إنشاء نظام حسابات للحرفاء إلا إذا كان ذلك ضروريًا تقنيًا.

---

# 6. نظام الطلبات

في TYPE 2 وTYPE 3 يجب تحويل السلة الحالية من مجرد LocalStorage إلى نظام طلبات حقيقي.

حاليًا السلة:

```javascript
cart = {
   product_id: quantity
}
```

ولا توجد حاليًا كتابة للطلبات في D1.

يجب إضافة Backend حقيقي للطلبات.

مثال منطقي:

```text
Customer
   ↓
Cart
   ↓
Submit Order
   ↓
D1
   ↓
Order
   ↓
Table
   ↓
Waiter
```

يجب إنشاء نموذج بيانات مناسب مثل:

```text
orders
order_items
tables
```

مع إمكانية إضافة جداول مساعدة إذا لزم الأمر.

---

# 7. حالات الطلب

يجب أن يكون للطلب Status واضح.

مثال:

```text
NEW
CONFIRMED
SERVED
CANCELLED
```

أو أي أسماء أفضل يراها الوكيل مناسبة.

المهم أن يكون هناك lifecycle واضح.

مثال:

```text
Customer sends order
        ↓
NEW
        ↓
Waiter sees order
        ↓
CONFIRMED
        ↓
Waiter delivers order
        ↓
SERVED
```

---

# 8. واجهة النادل

يجب إنشاء واجهة مخصصة للنادل.

الواجهة يجب أن تكون بسيطة جدًا وسريعة، ومناسبة للهاتف أو Tablet.

يجب أن يرى النادل:

```text
Table 12
────────────
2 × Café
1 × Croissant
1 × Jus Orange

Total: 15.500 DT

[Confirm]
[Delivered]
```

أو تصميم أفضل حسب UX الحالي.

الأهم:

- ترتيب الطلبات حسب الوقت.
- إبراز رقم الطاولة بشكل واضح جدًا.
- معرفة الطلبات الجديدة.
- معرفة الطلبات التي تمت معالجتها.
- إمكانية تأكيد تقديم الطلب.
- إمكانية تحديث حالة الطلب.
- تحديث الواجهة تلقائيًا أو بطريقة Polling خفيفة.
- عدم تحميل الصفحة بالكامل عند كل تغيير.
- عدم إعطاء النادل صلاحيات الإدارة.

---

# 9. واجهة مشرف المحل في TYPE 2

يجب أن يحصل المشرف على لوحة تحكم تحتوي على:

### القائمة

- Products
- Categories
- Availability
- Images

### الطلبات

- الطلبات الحالية.
- عدد الطلبات.
- المواد المباعة.
- الكميات.
- إجمالي المبيعات اليومية.

### الطاولات

- إنشاء طاولة.
- تعديل رقم الطاولة.
- تعطيل طاولة.
- عرض QR للطاولة إذا تم تنفيذ ذلك.

---

# 10. الحساب اليومي — TYPE 2

هذا الجزء مهم جدًا.

في TYPE 2 لا نريد الاحتفاظ بتاريخ طويل للبيانات.

المطلوب:

> المشرف يرى بيانات النشاط خلال يوم العمل الحالي فقط.

مثال:

```text
Today's Activity

Orders: 42
Items sold: 118

Café:        42
Croissant:   18
Jus:         25
Pizza:       10

Total:
245.500 DT
```

لكن عند بداية يوم عمل جديد يجب إعادة العداد إلى الصفر.

---

# 11. ساعات عمل المحل

يجب أن يستطيع مشرف المحل تحديد:

```text
Opening Time
Closing Time
```

مثال:

```text
Opening: 07:00
Closing: 23:00
```

يجب تعريف مفهوم واضح لـ **Business Day**.

لا تعتمد فقط على تاريخ الساعة `00:00`.

مثال:

إذا كان المحل يعمل:

```text
07:00 → 02:00
```

فإن:

```text
01:00
```

ينتمي إلى يوم العمل السابق، وليس إلى اليوم التقويمي الجديد.

لذلك يجب إنشاء منطق Business Day مناسب.

### المطلوب

عند بداية Business Day جديد:

- تصفير counters اليومية.
- بدء دورة يومية جديدة.
- عدم عرض مبيعات اليوم السابق ضمن TYPE 2.

**لكن لا تحذف البيانات القديمة بشكل عشوائي قبل التأكد من متطلبات النظام وقواعد D1.**

يمكن استعمال بيانات مؤقتة أو Daily Aggregate حسب التصميم الأفضل.

---

# 12. TYPE 3 — Analytics

TYPE 3 هو نفس TYPE 2 من حيث:

- Customer
- Admin
- Waiter
- Tables
- Orders

لكن يضاف إليه نظام Analytics.

---

# 13. الاحتفاظ ببيانات آخر 6 أشهر

في TYPE 3 يجب الاحتفاظ بالبيانات التاريخية لمدة:

```text
6 Months
```

على الأقل.

يجب أن يستطيع المشرف تحليل:

- المداخيل.
- عدد الطلبات.
- المنتجات الأكثر مبيعًا.
- المنتجات الأقل مبيعًا.
- الكميات.
- متوسط قيمة الطلب.
- مقارنة الأشهر.
- أفضل الأيام.
- أضعف الأيام.
- أداء التصنيفات.
- إجمالي المبيعات.
- عدد المنتجات المباعة.

---

# 14. Dashboard TYPE 3

أنشئ لوحة قيادة احترافية ومناسبة لصاحب مقهى/مطعم، وليس Dashboard تقنيًا.

يجب أن تحتوي على KPIs واضحة.

مثال:

```text
┌────────────────┬────────────────┬────────────────┐
│ Today's Sales  │ Monthly Sales  │ Orders         │
│ 245.500 DT     │ 7,820.000 DT   │ 421            │
└────────────────┴────────────────┴────────────────┘
```

ثم:

### Monthly Revenue

رسم بياني:

```text
Jan   ███████
Feb   █████████
Mar   ██████
Apr   ███████████
May   █████████
Jun   ████████████
```

أو Chart مناسب.

### مقارنة الأشهر

يجب أن يستطيع المشرف اختيار شهرين أو أكثر ومقارنتهم.

مثال:

```text
October vs September

Revenue:
October    8,200 DT
September  7,450 DT

Growth:
+10.06%
```

### Top Products

مثال:

```text
1. Café       520
2. Croissant  390
3. Pizza      280
4. Jus        240
```

### Sales by Category

مثال:

```text
Drinks      35%
Food        45%
Desserts    20%
```

---

# 15. فترة الاحتفاظ بالبيانات

يجب عدم تخزين بيانات غير ضرورية إلى الأبد.

بالنسبة للنوع الثالث:

```text
Current date
     ↓
Keep previous 6 months
```

ويجب أن يكون هناك منطق واضح للتنظيف/الحذف الدوري للبيانات التي تتجاوز فترة الاحتفاظ.

لكن:

**لا تحذف البيانات مباشرة أثناء كل Request.**

استخدم آلية مناسبة لـCloudflare مثل:

- Scheduled Worker / Cron Trigger

إذا كان ذلك مناسبًا للمشروع الحالي.

---

# 16. Multi-Tenant Architecture

هذا هو أهم جزء في التطوير.

يجب أن تكون جميع بيانات المحل مرتبطة بـTenant واضح.

يمكن استخدام:

```text
tenant_id
```

أو:

```text
cafe_id
```

حسب التصميم الحالي.

لكن يجب اختيار طريقة واحدة والالتزام بها.

---

# 17. عزل بيانات المحلات

هذا شرط أمني أساسي.

إذا كان:

```text
Cafe A
```

لا يجوز بأي شكل أن يستطيع مستخدم Cafe A الوصول إلى:

```text
Cafe B
```

يجب أن يتم التحقق من الـTenant في Backend وليس في JavaScript فقط.

### ممنوع الاعتماد على:

```javascript
?cafe=123
```

كوسيلة أمان.

يجب أن يتحقق الـWorker من صلاحيات المستخدم والـTenant على مستوى API.

---

# 18. مدير النظام العام

إضافة Role جديد:

```text
SYSTEM_ADMIN
```

هذا المستخدم ليس مشرف محل.

هو مدير المنصة كلها.

يجب أن يحصل على لوحة تحكم خاصة لا تظهر للمستخدمين العاديين.

مثال:

```text
/system-admin
```

أو Routing أفضل حسب النظام الحالي.

---

# 19. وظائف مدير النظام

مدير النظام يستطيع:

### المحلات

- إنشاء محل جديد.
- تعديل بيانات المحل.
- تعطيل محل.
- إعادة تفعيل محل.
- حذف/أرشفة محل حسب الحاجة.
- البحث عن محل.
- مشاهدة نوع الاشتراك.
- تغيير نوع الاشتراك.

### الحسابات

إنشاء حساب المشرف الأول للمحل:

```text
Cafe
Name
Slug
Admin Name
Admin Email
Password
Plan Type
Status
```

---

# 20. أنواع الاشتراكات في النظام

استخدم قيمة واضحة مثل:

```text
PLAN_BASIC
PLAN_ORDERS
PLAN_ANALYTICS
```

أو أسماء أكثر وضوحًا.

المهم:

```text
TYPE 1 → Customer + Admin
TYPE 2 → Customer + Admin + Waiter + Orders
TYPE 3 → Customer + Admin + Waiter + Orders + Analytics
```

ويجب ألا تظهر الواجهات والوظائف غير المتاحة لنوع الاشتراك.

---

# 21. Feature Gating

لا يكفي إخفاء الزر في Frontend.

يجب تطبيق Feature Gating في:

```text
Frontend
+
Backend
```

مثال:

إذا كان:

```text
plan = TYPE 1
```

يجب ألا يستطيع المستخدم استدعاء API خاص بالطلبات مباشرة.

مثال:

```text
POST /api/orders
```

يجب أن يتحقق الـWorker:

```text
Does this tenant have Orders feature?
```

إذا لا:

```text
403 Forbidden
```

---

# 22. أدوار المستخدمين

صمم نظام Roles واضحًا.

مثال:

```text
SYSTEM_ADMIN
SHOP_ADMIN
WAITER
CUSTOMER
```

مع صلاحيات واضحة.

### SYSTEM_ADMIN

يستطيع إدارة جميع المحلات.

### SHOP_ADMIN

يستطيع إدارة محل واحد فقط.

### WAITER

يستطيع رؤية الطلبات وإدارتها، ولا يستطيع تعديل المنتجات أو إعدادات المحل.

### CUSTOMER

يستطيع مشاهدة القائمة وإنشاء الطلبات حسب نوع الاشتراك.

---

# 23. قاعدة البيانات

قم بتعديل قاعدة البيانات الحالية بدل إنشاء قاعدة بيانات جديدة من الصفر.

يجب المحافظة على البيانات الحالية قدر الإمكان.

راجع الجداول الموجودة:

```text
cafes
categories
products
daily_availability
admins
sessions
files
```

ثم أضف الجداول/الأعمدة المطلوبة.

من المحتمل أن تحتاج إلى كيانات مثل:

```text
cafes
admins
sessions
categories
products
daily_availability
files
tables
orders
order_items
waiters
daily_sales
monthly_sales
```

لكن **لا تنفذ هذه البنية حرفيًا إذا كان تحليل الكود الحالي يقود إلى تصميم أفضل**.

المطلوب هو تصميم قاعدة بيانات سليمة، بسيطة، وقابلة للتوسع.

---

# 24. Migration

لا تقم بمسح قاعدة البيانات الحالية.

أنشئ Migration آمنة.

يجب أن يبقى المحل الحالي قابلًا للعمل بعد التحديث.

مثلاً:

```text
Existing Café
     ↓
Migration
     ↓
Existing Café becomes Tenant #1
```

يجب ألا تضيع:

- المنتجات.
- التصنيفات.
- الصور.
- إعدادات المظهر.
- الحسابات.
- التوفر الحالي.

---

# 25. الصور — تغيير جوهري

التطبيق حاليًا يدعم تخزين الصور في D1 `files`، وبعض الصور يمكن أن تكون روابط خارجية.

المطلوب الآن تغيير هذا السلوك.

## قاعدة مهمة جدًا:

**مشرف المحل ممنوع من إدراج صورة من جهازه أو من الإنترنت.**

لا يوجد:

```text
Upload Image
Browse Computer
Paste Image URL
```

للمستخدم الإداري.

بدل ذلك:

```text
Select from Application Image Library
```

فقط.

---

# 26. مكتبة الصور الداخلية

يجب إنشاء مكتبة صور مركزية للتطبيق.

المكتبة لا تكون خاصة بمحل واحد، بل هي:

```text
Application Image Library
```

ويقوم مدير النظام أو آلية إدارة خاصة بالتطبيق بإدارة هذه الصور.

مشرف المحل يستطيع فقط الاختيار منها.

---

# 27. تنظيم مكتبة الصور

يجب تقسيم الصور حسب مجموعات المواد.

مثال:

```text
☕ Coffee
   ├── Espresso
   ├── Cappuccino
   ├── Latte
   └── American Coffee

🥤 Drinks
   ├── Juice
   ├── Soda
   └── Water

🍕 Food
   ├── Pizza
   ├── Sandwich
   └── Burger

🍰 Desserts
   ├── Cake
   ├── Croissant
   └── Ice Cream
```

يمكن أن تكون البنية:

```text
image_categories
application_images
```

أو تصميم أفضل حسب الدراسة.

---

# 28. Image Library UI

عندما يقوم مشرف المحل باختيار صورة لمنتج:

لا تفتح File Picker.

بل افتح:

```text
Image Library Modal
```

مثال:

```text
Choose Product Image

[ Coffee ] [ Drinks ] [ Food ] [ Desserts ]

--------------------------------

[img] [img] [img] [img]
[img] [img] [img] [img]
[img] [img] [img] [img]

                    [Cancel] [Select]
```

يجب عرض الصور على شكل **Thumbnail Grid**.

ويجب أن يستطيع المشرف:

- اختيار التصنيف.
- رؤية الصور المصغرة.
- البحث إن كان عدد الصور كبيرًا.
- اختيار صورة.
- إلغاء الاختيار.

---

# 29. الصور المصغرة

لا تقم بتحميل صور ضخمة كاملة عند عرض المكتبة.

يجب تصميم آلية مناسبة للأداء.

إذا كانت البنية الحالية تسمح:

```text
thumbnail
+
original
```

أو أي طريقة أخرى مناسبة لـCloudflare.

المهم أن تكون مكتبة الصور سريعة حتى لو أصبح لديها مئات أو آلاف الصور.

---

# 30. منع الصور الخارجية

يجب إزالة أو تعطيل أي إمكانية تسمح لمشرف المحل باستخدام:

```text
External URL
```

كمصدر لصورة المنتج.

يجب أن تكون الصورة المختارة مرتبطة بـ:

```text
application_image_id
```

وليس:

```text
image_url
```

قدر الإمكان.

---

# 31. الحفاظ على التصميم الحالي

لا تقم بإعادة تصميم التطبيق بالكامل دون داعٍ.

حافظ على:

- الهوية البصرية الحالية.
- نظام الألوان.
- Responsive design.
- FR / AR / EN.
- RTL للعربية.
- Card sizes.
- CSS custom properties.
- طريقة عرض المنتجات الحالية.

الـREADME الحالي يحدد وجود ثلاثة أحجام للبطاقات:

```text
lg
md
sm
```

ويجب المحافظة عليها.

---

# 32. الترجمة

جميع النصوص الجديدة يجب أن تضاف إلى نظام الترجمة الحالي.

لا تكتب نصوصًا جديدة مباشرة داخل HTML/JS إذا كان النظام الحالي يعتمد:

```javascript
t('key')
```

يجب إضافة الترجمات إلى:

```text
FR
AR
EN
```

على الأقل.

ويجب الاهتمام بشكل خاص بالعربية:

```text
RTL
```

---

# 33. Routing

راجع نظام SPA الحالي قبل إضافة صفحات جديدة.

لا تنشئ نظام Routing جديدًا إذا كان الموجود يمكن تطويره.

يجب أن تصبح الواجهات منطقياً مثل:

```text
Customer
/admin
/waiter
/system-admin
```

أو بنية أفضل.

يجب أن يكون لكل Route Guard مناسب.

مثال:

```text
/system-admin
      ↓
SYSTEM_ADMIN only

/admin
      ↓
SHOP_ADMIN only

/waiter
      ↓
WAITER only
```

---

# 34. API Architecture

حافظ على نمط REST الحالي:

```text
/api/*
```

ووسع الـAPI بشكل منظم.

أمثلة محتملة:

```text
/api/system/cafes
/api/system/cafe-create
/api/system/cafe-update

/api/login
/api/logout

/api/menu

/api/products
/api/categories

/api/tables
/api/orders
/api/orders/update

/api/waiter/orders

/api/analytics
/api/analytics/monthly
/api/analytics/products

/api/image-library
```

لكن لا تلتزم بهذه الأسماء حرفيًا إذا كان تنظيم API الحالي يتطلب أسماء مختلفة.

---

# 35. Security

راجع نظام المصادقة الحالي بالكامل.

الـREADME يوضح أن النظام الحالي يستخدم SHA-256 مع salt ثابت:

```text
cafe-azur::
```

ويستخدم Session Token في `sessionStorage`.

قبل إضافة Multi-Tenant يجب تقييم هذه الآلية.

إذا كان تغييرها ضروريًا لتحسين الأمان، قم بذلك بشكل تدريجي وآمن، لكن لا تكسر الحسابات الحالية دون Migration.

يجب التأكد من:

- Authentication.
- Authorization.
- Role checks.
- Tenant checks.
- Session expiration.
- API protection.
- منع IDOR.
- منع الوصول إلى بيانات Tenant آخر.
- عدم الاعتماد على Frontend في الحماية.

---

# 36. الأداء

يجب مراعاة أن المشروع يعمل على Cloudflare Workers + D1.

لا تنشئ Queries ثقيلة بلا داعٍ.

يجب:

- استخدام indexes مناسبة.
- تقليل Queries.
- عدم تحميل جميع الطلبات التاريخية مرة واحدة.
- استخدام pagination.
- تحميل Analytics حسب الفترة المطلوبة.
- تحميل الصور المصغرة فقط في Image Library.
- تجنب إرسال بيانات غير ضرورية للـClient.

---

# 37. Dashboard Design

لوحة مدير النظام:

```text
┌─────────────────────────────────────────┐
│ System Dashboard                        │
├─────────────────────────────────────────┤
│ Total Cafés     Active    Type 2    Type 3
│    35             32        12        8
├─────────────────────────────────────────┤
│ Cafés                                   │
│                                         │
│ Search [...................]             │
│                                         │
│ Café       Plan       Status    Actions │
│ Café A     Type 1     Active    Edit    │
│ Café B     Type 2     Active    Edit    │
│ Café C     Type 3     Active    Edit    │
└─────────────────────────────────────────┘
```

---

# 38. Shop Admin Dashboard

يجب أن يختلف حسب Plan.

### TYPE 1

```text
Dashboard
Products
Categories
Availability
Images
Appearance
Settings
```

### TYPE 2

إضافة:

```text
Orders
Tables
Daily Sales
Waiter Management
```

### TYPE 3

إضافة:

```text
Orders
Tables
Daily Sales
Analytics
Reports
```

---

# 39. عدم إظهار الميزات غير المتاحة

إذا كان المحل:

```text
TYPE 1
```

لا تعرض:

```text
Orders
Tables
Waiter
Analytics
```

حتى لا تبدو الواجهة غير منظمة.

وحتى لو حاول المستخدم الوصول إليها يدويًا يجب أن يمنعها Backend.

---

# 40. Data Model Concept

يجب أن تكون العلاقات تقريبًا:

```text
SYSTEM_ADMIN
      │
      ├── manages
      │
      ▼
    CAFE
      │
      ├── Categories
      │
      ├── Products
      │
      ├── Tables
      │
      ├── Admins
      │
      ├── Waiters
      │
      └── Orders
             │
             └── Order Items
```

والصور:

```text
Application Image Library
          │
          ├── Coffee
          ├── Food
          ├── Drinks
          └── Desserts
                 │
                 ▼
              Product
```

---

# 41. Daily Business Logic

أنشئ مفهومًا واضحًا:

```text
business_date
```

بدل الاعتماد فقط على:

```text
DATE(timestamp)
```

مثال:

```text
Opening: 08:00
Closing: 02:00
```

إذا كان الوقت:

```text
2026-10-31 01:00
```

فهو تابع لـBusiness Day:

```text
2026-10-30
```

حسب إعدادات المحل.

يجب اختبار هذه الحالة جيدًا.

---

# 42. Analytics Calculations

يجب أن تكون الحسابات مبنية على البيانات الفعلية.

مثلاً:

```text
Revenue =
SUM(order_items.quantity * order_items.unit_price)
```

ولا تعتمد على السعر الحالي للمنتج.

**مهم:**  
عند إنشاء Order Item يجب حفظ السعر الذي تم به البيع في ذلك الوقت:

```text
unit_price
```

حتى إذا تغير سعر المنتج لاحقًا لا تتغير المبيعات التاريخية.

---

# 43. عدم تعديل البيانات التاريخية

مثال:

اليوم:

```text
Café = 2.500 DT
```

غدًا تغير إلى:

```text
Café = 3.000 DT
```

يجب أن يبقى الطلب القديم:

```text
2.500 DT
```

---

# 44. Analytics بدون تعقيد زائد

لا تستخدم مكتبة Charts كبيرة إذا لم تكن ضرورية.

إذا كان بالإمكان إنشاء الرسوم باستخدام:

- CSS
- SVG
- Canvas
- Vanilla JS

فذلك أفضل لتقليل حجم المشروع.

لكن إذا كانت مكتبة صغيرة ومناسبة ومبررة، يمكن استخدامها.

---

# 45. التوافق مع الهاتف

يجب أن تكون جميع الواجهات:

```text
Mobile First
```

خصوصًا:

- Customer.
- Waiter.
- Shop Admin.

واجهة النادل يجب أن تكون مريحة جدًا للاستخدام على هاتف صغير.

---

# 46. التحديث الفوري للطلبات

لا تفترض وجود WebSocket إذا لم يكن ضروريًا.

في بيئة Cloudflare يمكن استخدام:

```text
Polling
```

بفاصل مناسب، أو آلية أفضل إذا كانت متوافقة مع المشروع.

المطلوب أن يرى النادل الطلبات الجديدة بسرعة.

مثلاً:

```text
كل 3–5 ثواني
```

مع تجنب استهلاك موارد غير ضرورية.

---

# 47. Backward Compatibility

أهم شرط:

**المشروع الحالي يجب أن يبقى قابلًا للتشغيل أثناء التطوير وبعده.**

بعد كل مرحلة:

1. قم بالتحقق من Syntax.
2. تحقق من API.
3. تحقق من D1 schema.
4. تحقق من Frontend.
5. تحقق من Authentication.
6. تحقق من عدم كسر القائمة الحالية.

---

# 48. خطة التنفيذ المطلوبة

نفذ المشروع على مراحل.

## المرحلة 1

تحليل الكود الحالي.

لا تعدل شيئًا.

قدم تقريرًا داخليًا مختصرًا يوضح:

```text
Current Architecture
Current Database
Current Authentication
Current Routes
Current API
Current UI
Current Image System
```

ثم انتقل للتنفيذ.

## المرحلة 2

Multi-Tenant:

```text
cafes
tenants
admins
roles
sessions
```

مع عزل البيانات.

## المرحلة 3

System Admin.

## المرحلة 4

Plan Types.

## المرحلة 5

Tables.

## المرحلة 6

Orders.

## المرحلة 7

Waiter Interface.

## المرحلة 8

Daily Business Day.

## المرحلة 9

Analytics و6-month history.

## المرحلة 10

Image Library.

## المرحلة 11

Testing + Security + Performance.

---

# 49. اختبارات إلزامية

يجب إنشاء واختبار السيناريوهات التالية.

### Test 1

إنشاء:

```text
Cafe A – Type 1
```

والتأكد من ظهور:

```text
Customer
Admin
```

فقط.

### Test 2

إنشاء:

```text
Cafe B – Type 2
```

والتأكد من ظهور:

```text
Customer
Admin
Waiter
```

### Test 3

إنشاء:

```text
Cafe C – Type 3
```

والتأكد من ظهور:

```text
Customer
Admin
Waiter
Analytics
```

### Test 4

Cafe A لا يستطيع قراءة Products الخاصة بـCafe B.

### Test 5

Admin Cafe B لا يستطيع استدعاء API الخاص بـCafe C.

### Test 6

Customer يرسل طلبًا من Table 5.

يجب أن يظهر الطلب للنادل:

```text
Table 5
```

### Test 7

النادل يؤكد الطلب.

يجب أن يتغير Status.

### Test 8

المشرف يرى:

```text
Daily Revenue
```

والكميات.

### Test 9

يبدأ Business Day جديد.

يتم فصل بيانات اليوم الجديد عن السابق في TYPE 2.

### Test 10

TYPE 3 يحتفظ بالبيانات التاريخية.

### Test 11

تغيير سعر المنتج لا يغير سعر الطلب القديم.

### Test 12

المشرف يحاول Upload صورة من جهازه.

يجب ألا توجد هذه الإمكانية.

### Test 13

المشرف يفتح Image Library.

تظهر:

```text
Categories
Thumbnails
Select
```

### Test 14

اختيار صورة من المكتبة يربط المنتج بـImage ID.

---

# 50. قاعدة مهمة حول الصور

لا تقم بحذف نظام الصور الحالي قبل فهمه.

قم أولًا بتحليل:

```text
files
/api/upload
image
image URLs
```

ثم قم بعمل Migration تدريجي.

إذا كانت الصور الحالية غير متوافقة مع النظام الجديد:

- حافظ عليها.
- اربطها بالـImage Library إذا كان ذلك ممكنًا.
- أو أنشئ آلية Migration آمنة.

لا تفقد صور المنتجات الحالية.

---

# 51. قاعدة مهمة حول البيانات القديمة

لا تستخدم:

```sql
DROP TABLE
```

ولا:

```sql
DELETE FROM ...
```

بشكل جماعي أثناء التطوير.

أي Migration destructive يجب أن تكون مبررة، آمنة، وقابلة للاسترجاع قدر الإمكان.

---

# 52. الكود

حافظ على أسلوب المشروع الحالي.

بما أن التطبيق حاليًا Vanilla JS ولا يستخدم Framework، لا تقم بإدخال:

```text
React
Vue
Next.js
Angular
```

إلا إذا أثبت التحليل أن ذلك ضروري جدًا.

الأولوية:

```text
Extend existing architecture
```

وليس:

```text
Rewrite everything
```

---

# 53. جودة الكود

أثناء التعديل:

- لا تكرر الكود بلا داعٍ.
- أنشئ functions واضحة.
- افصل منطق Authentication عن Business Logic.
- افصل Tenant Resolution.
- افصل Order Logic.
- افصل Analytics Logic.
- افصل Image Library Logic.
- لا تضع كل المنطق في Function واحدة ضخمة.
- حافظ على أسماء واضحة.
- أضف تعليقات فقط حيث تكون ضرورية.

---

# 54. API Validation

كل API يجب أن يتحقق من:

```text
Authentication
Authorization
Tenant
Input Validation
Plan
Role
```

قبل تنفيذ العملية.

مثال:

```text
POST /api/orders

1. Is session valid?
2. What is the user?
3. What is the tenant?
4. Is this tenant TYPE 2/3?
5. Is this table belonging to this tenant?
6. Are products belonging to this tenant?
7. Are products currently available?
8. Create order.
```

---

# 55. لا تثق بالـFrontend

أي:

```text
tenant_id
role
plan
price
table_id
product_id
```

يتم إرسالها من Browser يجب اعتبارها بيانات غير موثوقة.

يجب إعادة التحقق منها في Worker.

---

# 56. النتائج المطلوبة من الوكيل

بعد الانتهاء يجب أن يقدم الوكيل:

## 1. ملخص التعديلات

مثال:

```text
Implemented:
- Multi-tenant
- System Admin
- 3 Plans
- Tables
- Orders
- Waiter
- Analytics
- Image Library
```

## 2. Database Changes

قائمة بالجداول الجديدة والمعدلة.

## 3. API Changes

قائمة بالـEndpoints الجديدة والمعدلة.

## 4. Security Changes

ما تم تغييره في:

```text
Authentication
Authorization
Tenant Isolation
```

## 5. Migration Instructions

كيفية تحديث D1 بدون فقد البيانات.

## 6. Deployment Instructions

مثلاً:

```bash
wrangler dev
wrangler deploy
```

مع أي أوامر Migration لازمة.

## 7. Testing Report

اذكر الاختبارات التي تم تنفيذها ونتيجتها.

---

# 57. معيار النجاح النهائي

يعتبر التطوير ناجحًا فقط إذا أصبح التطبيق قادرًا على تنفيذ السيناريو التالي:

```text
SYSTEM ADMIN
     │
     ├── Create Café A → TYPE 1
     │
     ├── Create Café B → TYPE 2
     │
     └── Create Café C → TYPE 3
```

### Café A

```text
Customer
+
Admin
```

### Café B

```text
Customer
+
Admin
+
Waiter
+
Tables
+
Orders
+
Daily Sales
```

### Café C

```text
Customer
+
Admin
+
Waiter
+
Tables
+
Orders
+
Daily Sales
+
6 Months History
+
Analytics Dashboard
```

مع ضمان:

```text
Café A ≠ Café B ≠ Café C
```

من ناحية البيانات والصلاحيات.

---

# 58. أهم قاعدة في كامل المشروع

**لا تعيد بناء التطبيق من الصفر.**

ابدأ من التطبيق الموجود.

افهم:

```text
Existing Code
Existing Database
Existing API
Existing UI
Existing Authentication
```

ثم قم بالتطوير تدريجيًا.

حافظ على جميع الوظائف الموجودة التي لا تتعارض مع المتطلبات الجديدة.

إذا وجدت تعارضًا بين البنية الحالية والمتطلبات الجديدة، لا تتخذ قرارًا عشوائيًا؛ حلل التأثير أولًا واختر الحل الأقل خطورة والأكثر قابلية للصيانة.

وأخيرًا:

**لا تعتبر المهمة مكتملة بمجرد أن تعمل الواجهة بصريًا.**

المطلوب هو نظام حقيقي يعمل من:

```text
Database
↓
Backend
↓
Authentication
↓
Authorization
↓
Tenant Isolation
↓
API
↓
Frontend
```

مع المحافظة على الأداء، الأمان، التوافق مع Cloudflare Workers + D1، ودعم FR / AR / EN.