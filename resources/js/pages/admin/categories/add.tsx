import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import admincategories from '@/routes/admin/categories';
import { ArrowLeft, Tag, Folder } from 'lucide-react';

interface Category {
    id: number;
    name: string;
}

interface Props {
    categories: Category[];
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function AdminCategoryCreate({ categories }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        parent_id: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(admincategories.store().url);
    };

    return (
        <>
            <Head title="Add Category" />
            <div className="mx-auto w-full max-w-2xl p-6">
                <Link href={admincategories.index().url}>
                    <Button variant="ghost" size="sm" className="-ml-3 mb-4">
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to categories
                    </Button>
                </Link>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
                        <Tag className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Add Category</h1>
                        <p className="text-sm text-muted-foreground">
                            Create a new product category.
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
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Electronics"
                                    maxLength={255}
                                />
                                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="parent_id">Parent category (optional)</Label>
                                <select
                                    id="parent_id"
                                    className={selectClass}
                                    value={data.parent_id}
                                    onChange={(e) => setData('parent_id', e.target.value)}
                                >
                                    <option value="">No parent (top-level category)</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.parent_id && (
                                    <p className="text-xs text-destructive">{errors.parent_id}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-end gap-3">
                        <Link href={admincategories.index().url}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Category'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
