import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { BarcodeLabel } from '@/components/barcode-label';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import admincategories from '@/routes/admin/categories';
import { ArrowLeft, Tag, Folder } from 'lucide-react';

interface Category {
    id: number;
    name: string;
    barcode: string | null;
    parent_id: number | null;
    parent: {
        id: number;
        name: string;
    } | null;
    children: Array<{
        id: number;
        name: string;
    }>;
}

interface ParentCategory {
    id: number;
    name: string;
    barcode: string | null;
}

interface Props {
    category: Category;
    categories: ParentCategory[];
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function AdminCategoryEdit({ category, categories }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: category.name,
        barcode: category.barcode ?? '',
        parent_id: category.parent_id ? String(category.parent_id) : '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(admincategories.update(category.id).url);
    };

    return (
        <>
            <Head title={`Edit ${category.name}`} />
            <div className="mx-auto w-full max-w-2xl p-6">
                <Link href={admincategories.index().url}>
                    <Button variant="ghost" size="sm" className="mb-4 -ml-3">
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to categories
                    </Button>
                </Link>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
                        <Tag className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Edit Category
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Update the details for{' '}
                            <strong>{category.name}</strong>.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Folder className="size-4" />
                                Category Details
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Category name and parent category (optional).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Category name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    maxLength={255}
                                />
                                {errors.name && (
                                    <p className="text-xs text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="barcode">
                                    Category barcode
                                </Label>
                                <Input
                                    id="barcode"
                                    value={data.barcode}
                                    onChange={(e) =>
                                        setData('barcode', e.target.value)
                                    }
                                    placeholder="Leave blank to generate automatically"
                                    maxLength={80}
                                />
                                {errors.barcode && (
                                    <p className="text-xs text-destructive">
                                        {errors.barcode}
                                    </p>
                                )}
                                <BarcodeLabel
                                    value={data.barcode}
                                    label={data.name}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="parent_id">
                                    Parent category (optional)
                                </Label>
                                <select
                                    id="parent_id"
                                    className={selectClass}
                                    value={data.parent_id}
                                    onChange={(e) =>
                                        setData('parent_id', e.target.value)
                                    }
                                >
                                    <option value="">
                                        No parent (top-level category)
                                    </option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.parent_id && (
                                    <p className="text-xs text-destructive">
                                        {errors.parent_id}
                                    </p>
                                )}
                            </div>

                            {category.children &&
                                category.children.length > 0 && (
                                    <div className="rounded-lg bg-muted/20 p-3">
                                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                                            Subcategories (
                                            {category.children.length}):
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {category.children.map((child) => (
                                                <span
                                                    key={child.id}
                                                    className="inline-flex items-center rounded-md bg-background px-2 py-1 text-xs"
                                                >
                                                    {child.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-end gap-3">
                        <Link href={admincategories.index().url}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Updating...' : 'Update Category'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
