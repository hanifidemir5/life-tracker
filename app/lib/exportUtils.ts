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

// Escape HTML characters for Word export
function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

// Convert items to DOC (HTML format readable by Word)
export function itemsToWord(items: Item[], categoryName: string): string {
    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${categoryName} Export</title></head>
        <body>
            <h1>${categoryName}</h1>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Başlık</th>
                        <th>Açıklama</th>
                        <th>Kategori</th>
                        <th>Durum</th>
                        <th>Sahip</th>
                        <th>Tarih</th>
                        <th>Fotoğraflar</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${item.id}</td>
                            <td>${escapeHtml(item.title)}</td>
                            <td>${escapeHtml(item.description || "")}</td>
                            <td>${escapeHtml(categoryName)}</td>
                            <td>${item.status ? "Tamamlandı" : "Bekliyor"}</td>
                            <td>${escapeHtml(item.owner || "")}</td>
                            <td>${item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</td>
                            <td>${item.image_urls ? item.image_urls.join("; ") : ""}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </body>
        </html>
    `;
    return htmlContent;
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

// Export all data to Word (HTML format readable by Word)
export function allDataToWord(categories: Category[], itemsByCategory: Record<string, Item[]>): string {
    const allRows: string[] = [];

    categories.forEach(category => {
        const categoryItems = itemsByCategory[category.key] || [];
        categoryItems.forEach(item => {
            allRows.push(`
                <tr>
                    <td>${item.id}</td>
                    <td>${escapeHtml(item.title)}</td>
                    <td>${escapeHtml(item.description || "")}</td>
                    <td>${escapeHtml(category.name)}</td>
                    <td>${item.status ? "Tamamlandı" : "Bekliyor"}</td>
                    <td>${escapeHtml(item.owner || "")}</td>
                    <td>${item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</td>
                    <td>${item.image_urls ? item.image_urls.join("; ") : ""}</td>
                </tr>
            `);
        });
    });

    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Tüm Veriler Export</title></head>
        <body>
            <h1>Tüm Veriler</h1>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Başlık</th>
                        <th>Açıklama</th>
                        <th>Kategori</th>
                        <th>Durum</th>
                        <th>Sahip</th>
                        <th>Tarih</th>
                        <th>Fotoğraflar</th>
                    </tr>
                </thead>
                <tbody>
                    ${allRows.join("")}
                </tbody>
            </table>
        </body>
        </html>
    `;
    return htmlContent;
}

// Trigger file download in browser
export function downloadFile(content: string, filename: string, type: "csv" | "json" | "doc"): void {
    const mimeTypes = {
        csv: "text/csv;charset=utf-8;",
        json: "application/json;charset=utf-8;",
        doc: "application/msword;charset=utf-8;"
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
export function getExportFilename(baseName: string, type: "csv" | "json" | "doc"): string {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return `heartsync_${baseName}_${date}.${type}`;
}
