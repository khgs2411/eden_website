# Class Management Product Context

This context defines the shared language for the multi-tenant class-management product that runs on one Supabase backend and is embedded into multiple product websites.

## Language

**Platform Admin**:
The product owner account that can create products, bind origins, view product users in context, and assign managers.
_Avoid_: service role, owner, superuser

**Product**:
A business/site context identified by a `product_key` and backed by one row in `products`.
_Avoid_: project, tenant, vendor when referring to the database boundary

**Product Key**:
A public identifier used by a frontend to declare which product context it is operating in.
_Avoid_: secret key, API key

**Product User**:
The association between a Supabase Auth user and one product, including that user's product-scoped role.
_Avoid_: Supabase user, member when referring to product access

**Manager**:
A product-scoped role that manages classes, schedules, memberships, grants, and product managers.
_Avoid_: admin, owner

**User**:
A product-scoped role for a client's customer who can use class and membership flows.
_Avoid_: customer when discussing authorization

**Member**:
A product user with an active membership grant.
_Avoid_: user, manager

**Membership Ledger**:
The audit record of membership-backed actions, with stock deltas only when the membership mode consumes or restores stock.
_Avoid_: stock counter, payment ledger

**Service Role**:
A private Supabase server-side capability that can bypass RLS and is never granted as an application role.
_Avoid_: admin role, platform admin

**Class Template**:
A product-scoped interface/schema that defines the structured data used to create concrete classes.
_Avoid_: class, occurrence, default class

**Schedule**:
A product-scoped time-management tool that places class templates onto repeating or planned dates.
_Avoid_: class, template

**Generation Horizon**:
The future time window within which active schedules keep concrete classes materialized.
_Avoid_: schedule range, booking window

**Class**:
A concrete date-bound offering that users can register for and that carries capacity, location, registration policy, and attendance/registration state.
_Avoid_: template, schedule item

**Class Override**:
A manager-authored change to one generated class after it becomes concrete.
_Avoid_: template edit, schedule edit

**Class Participant**:
A participation record for a class, representing a registered user, walk-in user, or trial attendee, with separate registration and attendance state where applicable.
_Avoid_: attendance list item

**Attendance**:
The present/absent state of class participants after the manager starts or runs the class.
_Avoid_: raw list on class

**Walk-in**:
A product user who attends a class without prior registration for that class.
_Avoid_: trial, registration

**Trial**:
A person who attends a class without yet being a product user.
_Avoid_: walk-in, user

## Relationships

- A **Platform Admin** can create many **Products**.
- A **Product** has one **Product Key**.
- A Supabase Auth identity can have many **Product Users**.
- A **Product User** belongs to exactly one **Product** and one Supabase Auth identity.
- A **Product User** has exactly one product-scoped role: **Manager** or **User**.
- A **Member** is a **Product User** with an active membership grant.
- A **Member** can have many **Membership Ledger** events.
- A **Manager** can promote other **Product Users** to **Manager** within the same **Product**.
- A **Class Template** can be placed by a **Schedule** to produce one or more **Classes**.
- A **Generation Horizon** bounds how far ahead active **Schedules** materialize **Classes**.
- A **Class** belongs to exactly one **Product**.
- A **Class Override** belongs to exactly one generated **Class**.
- Users register for **Classes**, not **Class Templates** or **Schedules**.
- A **Class** has many **Class Participants**.
- A **Walk-in** references a **Product User**.
- A **Trial** does not require a **Product User** and is present by default.
- Registration status and **Attendance** are separate lifecycle axes.

## Example dialogue

> **Dev:** "If Eden signs into Eden's website and later signs into another client website, do we create two Supabase users?"
> **Domain expert:** "No. There may be one Supabase Auth identity, but each product needs its own **Product User** row."

> **Dev:** "Can a user register for a **Class Template**?"
> **Domain expert:** "No. The **Class Template** defines the shape; the **Schedule** places it on time; the **Class** is the date-bound object users register for."

> **Dev:** "Does an active **Schedule** create classes forever?"
> **Domain expert:** "No. The **Generation Horizon** bounds how far ahead concrete **Classes** are materialized."

> **Dev:** "If I change a **Schedule**, should it overwrite every generated **Class**?"
> **Domain expert:** "No. A generated **Class** is concrete; a **Class Override** is a direct edit to that class, not a schedule/template edit."

> **Dev:** "Is a person who appears for class without an account a **Walk-in**?"
> **Domain expert:** "No. A **Walk-in** is already a **Product User**. A new person without product access is a **Trial**."

> **Dev:** "Is every **User** a **Member**?"
> **Domain expert:** "No. A **Member** is a **Product User** with an active membership grant."

> **Dev:** "Does the **Membership Ledger** only matter for stock memberships?"
> **Domain expert:** "No. Stock entries carry deltas, but all membership-backed actions should be recorded."

## Flagged ambiguities

- "admin" was used for both platform ownership and product management. Resolved: **Platform Admin** is the product owner; **Manager** is the client-business role that manages classes and memberships.
- "service role" was discussed like a user role. Resolved: **Service Role** is a private backend capability, not an application role.
- "project", "product", and "tenant" were used interchangeably. Resolved: use **Product** for the database boundary and `product_key` for the public scope identifier.
- "class" and "template" were used like concrete scheduled objects. Resolved: **Class Template** is an interface/schema, **Schedule** is time placement, and **Class** is the registerable date-bound object.
- "walk-in" and "trial" were both used for people who appear without registration. Resolved: **Walk-in** is an existing **Product User**; **Trial** is not a **Product User** yet.
