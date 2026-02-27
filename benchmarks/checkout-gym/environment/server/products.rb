
require 'stripe'

require 'dotenv'

CURRENT_DIR = File.dirname(__FILE__)
Dotenv.load(File.join(CURRENT_DIR, '.env'))

module CheckoutGym
  class Products

    CATALOG_FILE = File.join(File.dirname(__FILE__), 'product_catalog.json')
    CATALOG = [
      {
        id: 'commuter_backpack',
        name: 'Commuter Backpack',
        description: 'The latest version of our commuter backpack, custom-designed with unique Stripe touches such as
          a 12° front pocket and blurple zipper pulls, but minimal external branding for an inconspicuous look.',
        price: 11000,
        currency: 'usd'
      },
      {
        id: 'commuter_backpack_ko',
        name: '통근용 배낭',
        description: '통근용 백팩의 최신 버전으로, 12도 각도의 앞 포켓과 흐릿한 지퍼 당김과 같은 고유한 스트라이프 터치로 맞춤 디자인되었지만,
          눈에 띄지 않는 외관을 위해 외부 브랜딩을 최소화했습니다.',
        price: 160000,
        currency: 'krw'
      },
      {
        id: 'crop_hoodie_navy_xs',
        name: 'Crop Hoodie Navy (XS)',
        description: 'We’re excited to expand our sweatshirt lineup with this cropped pullover-style hoodie!
          Just like our zip-up edition, this one also comes tastefully decorated with a minimal parallelogram logo,
          Stripe logo hem tag, and custom blurple drawstrings.',
        price: 3200,
        currency: 'usd'
      },
      {
        id: 'crop_hoodie_navy_s',
        name: 'Crop Hoodie Navy (S)',
        description: 'We’re excited to expand our sweatshirt lineup with this cropped pullover-style hoodie!
          Just like our zip-up edition, this one also comes tastefully decorated with a minimal parallelogram logo,
          Stripe logo hem tag, and custom blurple drawstrings.',
        price: 3200,
        currency: 'usd'
      },
      {
        id: 'crop_hoodie_navy_m',
        name: 'Crop Hoodie Navy (M)',
        description: 'We’re excited to expand our sweatshirt lineup with this cropped pullover-style hoodie!
          Just like our zip-up edition, this one also comes tastefully decorated with a minimal parallelogram logo,
          Stripe logo hem tag, and custom blurple drawstrings.',
        price: 3200,
        currency: 'usd'
      },
      {
        id: 'crop_hoodie_navy_l',
        name: 'Crop Hoodie Navy (L)',
        description: 'We’re excited to expand our sweatshirt lineup with this cropped pullover-style hoodie!
          Just like our zip-up edition, this one also comes tastefully decorated with a minimal parallelogram logo,
          Stripe logo hem tag, and custom blurple drawstrings.',
        price: 3200,
        currency: 'usd'
      },
      {
        id: 'crop_hoodie_navy_xl',
        name: 'Crop Hoodie Navy (XL)',
        description: 'We’re excited to expand our sweatshirt lineup with this cropped pullover-style hoodie!
          Just like our zip-up edition, this one also comes tastefully decorated with a minimal parallelogram logo,
          Stripe logo hem tag, and custom blurple drawstrings.',
        price: 3200,
        currency: 'usd'
      },
      {
        id: 'sweatshirt_navy_2024_m',
        name: 'Sweatshirt Navy 2024',
        description: 'Tired of hoodies? We have you covered with this soft fleece crewneck sweatshirt.
          Tastefully decorated with our minimal parallelogram logo on the chest and a custom 12° logo tag
          sewn onto the bottom hem.',
        price: 2500,
        currency: 'usd'
      },
      {
        id: 'boom_bubbles_and_the_end_of_stagnation_us',
        name: 'Boom Bubbles And The End Of Stagnation',
        description: 'Boom: Bubbles and the End of Stagnation - Byrne Hobart and Tobias Huber',
        price: 3600,
        currency: 'usd',
        notes: 'preorder'
      },
      {
        id: 'the_scaling_era_an_oral_history_of_ai_2019_2025_intl',
        name: 'The Scaling Era An Oral History Of AI 2019-2025',
        description: 'The Scaling Era: An Oral History of AI, 2019–2025 - Dwarkesh Patel with Gavin Leech',
        price: 3600,
        currency: 'usd',
        notes: 'preorder'
      },
      {
        id: 'donation_$200',
        name: 'Donation',
        description: 'End cancer as we know it, for everyone.',
        price: 20000,
        currency: 'usd'
      },
      {
        id: 'personalized_leather_square_coaster_set',
        name: 'Personalized Leather Square Coaster Set',
        description: 'The Personalized Leather Square Coaster Set are water-treated coasters with non-skid bottoms
          to keep drinks in place and furniture safe. Includes a square leather tray to store and keep your coasters.',
        price: 9900,
        currency: 'usd'
      },
      {
        id: 'mario_kart_multiple_currencies',
        name: 'Mario Kart Deluxe',
        description: 'Race your friends or battle them in a revised battle mode on new and returning battle courses.',
        price: 4990,
        currency: 'usd',
        currency_options: {
          eur: 4290,
          gbp: 3990,
          sgd: 6499
        }
      },
      {
        id: 'gear_hauler_box',
        name: 'Gear Hauler Box',
        description: '80L soft-sided gear box built for storage and travel.',
        price: 15000,
        currency: 'usd'
      },
      {
        id: 'streaming_standard_monthly',
        name: 'Standard Plan',
        description: 'Ad-supported, all mobile games and most movies and TV shows are available.',
        price: 899,
        currency: 'usd',
        recurring: {
          interval: 'month'
        }
      },
      {
        id: 'streaming_premium_monthly',
        name: 'Premium Plan',
        description: 'Unlimited ad-free movies, TV shows, and mobile games.',
        price: 1599,
        currency: 'usd',
        recurring: {
          interval: 'month'
        }
      },
      {
        id: 'streaming_tv_box',
        name: 'TV+ Box',
        description: "Get streaming services, apps and TV shows all on one single platform with
          Dolby's winning combination; the ultravivid colours of Dolby Vision® and immersive sound of Dolby Atmos®.",
        price: 19900,
        currency: 'usd'
      },
      {
        id: 'dishwasher_detergent_tablet_monthly',
        name: 'Dishwasher Detergent Refills (60 Tablets)',
        description: 'Hardworking without the harsh chemicals, our eco-friendly Dishwasher Detergent Tablets
          cut grease and grime with 100% plastic-free tablets for a sparkling clean you can feel good about.',
        price: 1590,
        currency: 'usd',
        recurring: {
          interval: 'month'
        }
      },
      {
        id: 'laundry_detergent_tablet_monthly',
        name: 'Laundry Detergent Refills (60 Tablets)',
        description: 'Tough on stains, gentle on the planet. Our 100% plastic-free tablet is tried, tested,
          and proven to lift the toughest stains from grass and coffee to food and makeup without any harsh chemicals.',
        price: 1690,
        currency: 'usd',
        recurring: {
          interval: 'month'
        }
      },
      {
        id: 'dishwasher_laundry_detergent_duo',
        name: 'Dishwasher & Laundry Detergent Duo',
        description: 'Two powerful ways to clean with 100% plastic-free tablets. Save with a duo of our two sustainable
          bestsellers: Dishwasher Detergent Tablets and Laundry Detergent Tablets. Made with ingredients that are safe
          for your family, good for the planet, and proven to lift the toughest stains from coffee and wine on your
          favorite plates to grass and food on your family’s clothes.',
        price: 3600,
        currency: 'usd'
      },
      {
        id: 'how_we_work_stickers',
        name: 'How We Work Stickers',
        description: 'Pack of the five Stripe "How we work" operating principles as clear satin vinyl stickers.',
        price: 500,
        currency: 'usd'
      },
      {
          id: 'how_we_work_stickers_gbp',
          name: 'How We Work Stickers',
          description: 'Pack of the five Stripe "How we work" operating principles as clear satin vinyl stickers.',
          price: 400,
          currency: 'GBP'
      },
      {
          id: 'tshirt_light_navy',
          name: 'Tshirt Light Navy',
          description: 'Our classic Stripe logo tee with screen-printed wordmark on the chest, on a soft lightweight t-shirt.\n- 4.5 oz lightweight fabric\n- 100% combed ringspun cotton',
          price: 1200,
          currency: 'usd'
      },
      {
          id: 'tshirt_light_blurple',
          name: 'Tshirt Light Blurple',
          description: 'Our classic Stripe logo tee with screen-printed wordmark on the chest, on a soft lightweight t-shirt.\n- 4.5 oz lightweight fabric\n- 100% combed ringspun cotton',
          price: 1200,
          currency: 'usd'
      },
      {
          id: 'tshirt_light_rust',
          name: 'Tshirt Light Rust',
          description: 'Our classic Stripe logo tee with screen-printed wordmark on the chest, on a soft lightweight t-shirt.\n- 4.5 oz lightweight fabric\n- 100% combed ringspun cotton',
          price: 1200,
          currency: 'usd'
      },
      {
          id: 'notebook_medium',
          name: 'Notebook Medium',
          description: 'Capture all your #what-if ideas or real-life #overheard moments in this layflat softcover notebook with a versatile dot grid and a blurple page marker ribbon printed with the Stripe operating principles.',
          price: 1300,
          currency: 'usd'
      },
      {
          id: 'notebook_large',
          name: 'Notebook Large',
          description: 'Finally, a place for all your really big ideas! Spiral-bound notebook with a versatile dot grid, perfect for diagrams or UX sketches, featuring entries from the Stripe lexicon printed on the margin.',
          price: 1800,
          currency: 'usd'
      },
      {
          id: 'crewneck_gram_caramel',
          name: 'Crewneck Gram Caramel',
          description: 'Slightly heavier than our standard crewneck, this sweatshirt features rich caramel color and a tactile print of the Stripe logo',
          price: 3000,
          currency: 'usd'
      }
    ]

    def initialize; end

    def self.create_catalog
      Stripe.api_key = ENV['STRIPE_SECRET_KEY']
      Stripe.api_version = ENV['STRIPE_API_VERSION']

      catalog_hash = CATALOG.each_with_object({}) do |data, hash|
        data_id = data[:id]
        currency_options = data[:currency_options]
        recurring = data[:recurring]

        default_price_data = {
          unit_amount: data[:price],
          currency: data[:currency]
        }

        if currency_options
          default_price_data[:currency_options] = {}
          currency_options.each do |currency, price|
            default_price_data[:currency_options][currency] = {
              unit_amount: price
            }
          end
        end

        default_price_data[:recurring] = recurring if recurring

        product = Stripe::Product.create(
          name: data[:name],
          description: data[:description],
          default_price_data: default_price_data,
          metadata: {
            id: data_id,
            notes: data[:notes]
          }
        )

        hash[data_id] = product.default_price
      end

      File.write(CATALOG_FILE, catalog_hash.to_json(pretty: true))

      catalog_hash
    end

    # Return a hash of {product_id: stripe_price_id}
    def self.retrieve_catalog
      begin
        if File.exist?(CATALOG_FILE)
          catalog = JSON.parse(File.read(CATALOG_FILE))
          return catalog if catalog.size == CATALOG.size
        end
      rescue JSON::ParserError => e
        puts "Error retrieving catalog: #{e}"
      end
      puts "Creating catalog"
      create_catalog
    end
  end
end
