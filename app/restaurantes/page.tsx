import { redirect } from 'next/navigation';

export default function RestaurantesRedirectPage() {
  redirect('/dashboard/restaurantes');
}
