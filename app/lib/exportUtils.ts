import { Item } from "@/app/hooks/useItems";
import { Category } from "@/app/hooks/useCategories";

// Convert items to CSV format
export function itemsToCSV(items: Item[], categoryName: string): string {
    const headers = ["ID", "Başlık", "Açıklama", "Kategori", "Durum", "Sahip", "Tarih", "Fotoğraflar"];

    const rows = items.map(item => [
        item.id,
        escapeCsvField(item.title),
        escapeCsvField(item.description || ""),
        categoryName,
        item.status ? "Tamamlandı" : "Bekliyor",
        item.owner || "",
        item.created_at ? new Date(item.created_at).toLocaleDateString() : "",
        item.image_urls ? item.image_urls.join("; ") : ""
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
    ].join("\n");

    return csvContent;
}

// Escape CSV field to handle commas and quotes
function escapeCsvField(field: string): string {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

// Convert items to JSON format
export function itemsToJSON(items: Item[], categoryName: string): string {
    const exportData = {
        exportDate: new Date().toISOString(),
        category: categoryName,
        itemCount: items.length,
        items: items.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            status: item.status,
            owner: item.owner,
            created_at: item.created_at,
            image_urls: item.image_urls
        }))
    };

    return JSON.stringify(exportData, null, 2);
}

// Export all data (categories + items)
export function allDataToCSV(categories: Category[], itemsByCategory: Record<string, Item[]>): string {
    const headers = ["ID", "Başlık", "Açıklama", "Kategori", "Durum", "Sahip", "Tarih", "Fotoğraflar"];

    const allRows: string[][] = [];

    categories.forEach(category => {
        const categoryItems = itemsByCategory[category.key] || [];
        categoryItems.forEach(item => {
            allRows.push([
                String(item.id),
                escapeCsvField(item.title),
                escapeCsvField(item.description || ""),
                category.name,
                item.status ? "Tamamlandı" : "Bekliyor",
                item.owner || "",
                item.created_at ? new Date(item.created_at).toLocaleDateString() : "",
                item.image_urls ? item.image_urls.join("; ") : ""
            ]);
        });
    });

    const csvContent = [
        headers.join(","),
        ...allRows.map(row => row.join(","))
    ].join("\n");

    return csvContent;
}

// Export all data to JSON
export function allDataToJSON(categories: Category[], itemsByCategory: Record<string, Item[]>): string {
    const exportData = {
        exportDate: new Date().toISOString(),
        totalCategories: categories.length,
        totalItems: Object.values(itemsByCategory).reduce((sum, items) => sum + items.length, 0),
        categories: categories.map(category => ({
            id: category.id,
            name: category.name,
            key: category.key,
            icon: category.icon_name,
            is_private: category.is_private,
            itemCount: (itemsByCategory[category.key] || []).length,
            items: itemsByCategory[category.key] || []
        }))
    };

    return JSON.stringify(exportData, null, 2);
}

// Trigger file download in browser
export function downloadFile(content: string, filename: string, type: "csv" | "json"): void {
    const mimeTypes = {
        csv: "text/csv;charset=utf-8;",
        json: "application/json;charset=utf-8;"
    };

    const blob = new Blob([content], { type: mimeTypes[type] });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

// Generate filename with date
export function getExportFilename(baseName: string, type: "csv" | "json"): string {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return `heartsync_${baseName}_${date}.${type}`;
}
