import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import admincategories from '@/routes/admin/categories';
import {
    Tag,
    Plus,
    Search,
    Pencil,
    Trash2,
    ChevronRight,
    ChevronDown,
    Folder,
    Package,
    CircleDot,
} from 'lucide-react';

interface Category {
    id: number;
    name: string;
    parent_id: number | null;
    parent: {
        id: number;
        name: string;
    } | null;
    children: Category[];
    products_count: number;
}

interface CategoriesIndexProps {
    categories: Category[];
}

function CategoryTreeItem({
    category,
    level = 0,
    selectedCategoryId,
    onSelect,
}: {
    category: Category;
    level?: number;
    selectedCategoryId: number | null;
    onSelect: (id: number) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = category.children && category.children.length > 0;
    const isSelected = category.id === selectedCategoryId;

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(category.id)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        onSelect(category.id);
                    }
                }}
                className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left transition-all outline-none ${
                    isSelected
                        ? 'border-primary/50 bg-primary/5 shadow-xs'
                        : 'border-transparent hover:border-border hover:bg-muted/40'
                }`}
                style={{ marginLeft: `${level * 12}px` }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {hasChildren ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpanded(!expanded);
                                }}
                                className="p-1 hover:bg-muted rounded"
                            >
                                {expanded ? (
                                    <ChevronDown className="size-4 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="size-4 text-muted-foreground" />
                                )}
                            </button>
                        ) : (
                            <div className="w-6" />
                        )}

                        <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
                            <Folder className="size-4 text-muted-foreground" />
                        </div>

                        <span className="text-sm font-semibold tracking-tight">{category.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="gap-1 text-xs">
                            <Package className="size-3" />
                            {category.products_count}
                        </Badge>
                    </div>
                </div>

                {category.parent && (
                    <div className="text-xs text-muted-foreground pl-11">
                        Parent: {category.parent.name}
                    </div>
                )}
            </div>

            {hasChildren && expanded && (
                <div className="space-y-1">
                    {category.children.map((child) => (
                        <CategoryTreeItem
                            key={child.id}
                            category={child}
                            level={level + 1}
                            selectedCategoryId={selectedCategoryId}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </>
    );
}

export default function AdminCategoriesIndex({ categories }: CategoriesIndexProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(categories[0]?.id ?? null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [confirmCategoryName, setConfirmCategoryName] = useState('');

    const topLevelCategories = categories.filter((c) => !c.parent_id);

    const filteredCategories = topLevelCategories.filter((c) => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];

    const handleDelete = () => {
        if (!categoryToDelete) return;

        router.delete(admincategories.destroy(categoryToDelete.id).url, {
            onSuccess: () => {
                setDeleteModalOpen(false);
                setCategoryToDelete(null);
                setConfirmCategoryName('');
                setSelectedCategoryId(null);
            },
        });
    };

    const handleDeleteClick = (category: Category) => {
        if (category.products_count > 0) {
            return;
        }
        if (category.children && category.children.length > 0) {
            return;
        }
        setCategoryToDelete(category);
        setConfirmCategoryName('');
        setDeleteModalOpen(true);
    };

    return (
        <>
            <Head title="Categories" />

            <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Tag className="size-5 text-primary" />
                            <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Manage product categories and their hierarchy.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={admincategories.create().url}>
                            <Button size="sm">
                                <Plus className="mr-1.5 size-4" />
                                Add Category
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Master-Detail Body */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Left Pane: Tree of Categories */}
                    <div className="flex w-80 shrink-0 flex-col border-r bg-muted/20">
                        <div className="border-b p-3">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search categories..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 pl-8 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredCategories.length > 0 ? (
                                filteredCategories.map((category) => (
                                    <CategoryTreeItem
                                        key={category.id}
                                        category={category}
                                        selectedCategoryId={selectedCategoryId}
                                        onSelect={setSelectedCategoryId}
                                    />
                                ))
                            ) : (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    No categories found matching &quot;{searchQuery}&quot;
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Detail Pane */}
                    <div className="flex flex-1 flex-col overflow-hidden bg-background">
                        {selectedCategory ? (
                            <>
                                {/* Header / Hero */}
                                <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/30">
                                            <Folder className="size-5 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold tracking-tight">
                                                {selectedCategory.name}
                                            </h2>
                                            <p className="text-xs text-muted-foreground">
                                                {selectedCategory.parent
                                                    ? `Parent: ${selectedCategory.parent.name}`
                                                    : 'Top-level category'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Toolbar */}
                                    <div className="flex items-center gap-2">
                                        <Link href={admincategories.edit(selectedCategory.id).url}>
                                            <Button variant="outline" size="sm">
                                                <Pencil className="mr-1.5 size-3.5" />
                                                Edit
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteClick(selectedCategory)}
                                            disabled={
                                                selectedCategory.products_count > 0 ||
                                                (selectedCategory.children &&
                                                    selectedCategory.children.length > 0)
                                            }
                                        >
                                            <Trash2 className="mr-1.5 size-3.5" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>

                                {/* Card Sections */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <Card className="border shadow-xs">
                                            <CardContent className="p-4 space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Package className="size-3.5" />
                                                    Products
                                                </div>
                                                <div className="font-mono text-lg font-bold">
                                                    {selectedCategory.products_count}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Products in this category
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border shadow-xs">
                                            <CardContent className="p-4 space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Folder className="size-3.5" />
                                                    Subcategories
                                                </div>
                                                <div className="font-mono text-lg font-bold">
                                                    {selectedCategory.children?.length ?? 0}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Child categories
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border shadow-xs">
                                            <CardContent className="p-4 space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <CircleDot className="size-3.5" />
                                                    Status
                                                </div>
                                                <div className="text-base font-semibold">
                                                    <Badge
                                                        variant="default"
                                                        className="bg-emerald-500 hover:bg-emerald-600"
                                                    >
                                                        Active
                                                    </Badge>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Category is visible
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Category Details */}
                                    <Card className="border">
                                        <CardHeader className="border-b bg-muted/20">
                                            <CardTitle className="text-sm">Category Details</CardTitle>
                                            <CardDescription className="text-xs">
                                                Hierarchy and classification information
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-4 divide-y divide-border/60 text-sm">
                                            <div className="flex items-center justify-between py-2">
                                                <span className="text-muted-foreground">Category ID</span>
                                                <span className="font-mono font-medium">{selectedCategory.id}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-2">
                                                <span className="text-muted-foreground">Parent Category</span>
                                                <span className="font-medium">
                                                    {selectedCategory.parent
                                                        ? selectedCategory.parent.name
                                                        : 'None (top-level)'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between py-2">
                                                <span className="text-muted-foreground">Deletion Status</span>
                                                <span
                                                    className={
                                                        selectedCategory.products_count > 0 ||
                                                        (selectedCategory.children &&
                                                            selectedCategory.children.length > 0)
                                                            ? 'text-amber-600 dark:text-amber-400 font-medium'
                                                            : 'text-emerald-600 dark:text-emerald-400 font-medium'
                                                    }
                                                >
                                                    {selectedCategory.products_count > 0 ||
                                                    (selectedCategory.children &&
                                                        selectedCategory.children.length > 0)
                                                        ? 'Protected (has data)'
                                                        : 'Can be deleted'}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Subcategories List */}
                                    {selectedCategory.children && selectedCategory.children.length > 0 && (
                                        <Card className="border">
                                            <CardHeader className="border-b bg-muted/20">
                                                <CardTitle className="text-sm">Subcategories</CardTitle>
                                                <CardDescription className="text-xs">
                                                    Child categories under {selectedCategory.name}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-4">
                                                <div className="space-y-2">
                                                    {selectedCategory.children.map((child) => (
                                                        <div
                                                            key={child.id}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => setSelectedCategoryId(child.id)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    setSelectedCategoryId(child.id);
                                                                }
                                                            }}
                                                            className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Folder className="size-4 text-muted-foreground" />
                                                                <span className="text-sm font-medium">{child.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {child.products_count} products
                                                                </Badge>
                                                                <ChevronRight className="size-4 text-muted-foreground" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    <Folder className="size-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Select a category to view details</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Category</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{categoryToDelete?.name}</strong>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <label className="text-sm font-medium">
                            Type the category name to confirm: <strong>{categoryToDelete?.name}</strong>
                        </label>
                        <Input
                            value={confirmCategoryName}
                            onChange={(e) => setConfirmCategoryName(e.target.value)}
                            placeholder={categoryToDelete?.name}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={confirmCategoryName !== categoryToDelete?.name}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminCategoriesIndex.layout = {
    breadcrumbs: [
        { title: 'Categories', href: admincategories.index().url },
    ],
};
