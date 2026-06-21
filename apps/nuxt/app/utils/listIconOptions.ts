import { getIcon } from '#shared/utils/icons'

export type ListIconOption = {
	label: string
	value: string
	icon: string
}

export const LIST_ICON_OPTIONS: ListIconOption[] = [
	{ label: 'Lijst', value: getIcon('optionList'), icon: getIcon('optionList') },
	{
		label: 'Afgevinkte lijst',
		value: getIcon('optionListCheck'),
		icon: getIcon('optionListCheck')
	},
	{
		label: 'Klembordlijst',
		value: getIcon('optionClipboardList'),
		icon: getIcon('optionClipboardList')
	},
	{
		label: 'Winkelwagen',
		value: getIcon('optionShoppingCart'),
		icon: getIcon('optionShoppingCart')
	},
	{
		label: 'Winkelmand',
		value: getIcon('optionShoppingBasket'),
		icon: getIcon('optionShoppingBasket')
	},
	{ label: 'Winkel', value: getIcon('optionStore'), icon: getIcon('optionStore') },
	{ label: 'Voorraad', value: getIcon('optionPackage'), icon: getIcon('optionPackage') },
	{ label: 'Label', value: getIcon('optionTag'), icon: getIcon('optionTag') },
	{ label: 'Receptenboek', value: getIcon('optionBook'), icon: getIcon('optionBook') },
	{
		label: 'Open kookboek',
		value: getIcon('optionBookOpen'),
		icon: getIcon('optionBookOpen')
	},
	{
		label: 'Bestek',
		value: getIcon('optionUtensils'),
		icon: getIcon('optionUtensils')
	},
	{
		label: 'Koksmuts',
		value: getIcon('optionChefHat'),
		icon: getIcon('optionChefHat')
	},
	{ label: 'Appel', value: getIcon('optionApple'), icon: getIcon('optionApple') },
	{ label: 'Wortel', value: getIcon('optionCarrot'), icon: getIcon('optionCarrot') },
	{ label: 'Vlees', value: getIcon('optionBeef'), icon: getIcon('optionBeef') },
	{ label: 'Vis', value: getIcon('optionFish'), icon: getIcon('optionFish') },
	{ label: 'Melk', value: getIcon('optionMilk'), icon: getIcon('optionMilk') },
	{ label: 'Ei', value: getIcon('optionEgg'), icon: getIcon('optionEgg') },
	{ label: 'Graan', value: getIcon('optionWheat'), icon: getIcon('optionWheat') },
	{
		label: 'Broodjes',
		value: getIcon('optionCroissant'),
		icon: getIcon('optionCroissant')
	},
	{
		label: 'Sandwich',
		value: getIcon('optionSandwich'),
		icon: getIcon('optionSandwich')
	},
	{ label: 'Pizza', value: getIcon('optionPizza'), icon: getIcon('optionPizza') },
	{ label: 'Salade', value: getIcon('optionSalad'), icon: getIcon('optionSalad') },
	{ label: 'Soep', value: getIcon('optionSoup'), icon: getIcon('optionSoup') },
	{ label: 'Koffie', value: getIcon('optionCoffee'), icon: getIcon('optionCoffee') },
	{
		label: 'Zon',
		value: getIcon('optionCloudSun'),
		icon: getIcon('optionCloudSun')
	},
	{ label: 'Medicatie', value: getIcon('optionPill'), icon: getIcon('optionPill') }
]
