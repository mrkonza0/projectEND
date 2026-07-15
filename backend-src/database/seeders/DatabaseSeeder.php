<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Project;
use App\Models\Proposal;
use App\Models\Report;
use App\Models\Researcher;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'name'     => 'ภาศพงศ์ องค์ธนาวัฒน์',
                'password' => Hash::make('password'),
                'faculty'  => 'วิทยาศาสตร์และเทคโนโลยี',
                'major'    => 'วิทยาการคอมพิวเตอร์',
                'position' => 'อาจารย์ประจำ',
                'phone'    => '055-123-456',
                'role'     => 'admin',
            ],
        );

        $somchai = User::updateOrCreate(
            ['email' => 'somchai@uru.ac.th'],
            [
                'name'     => 'สมชาย ใจดี',
                'password' => Hash::make('password'),
                'faculty'  => 'ครุศาสตร์',
                'major'    => 'การศึกษาปฐมวัย',
                'position' => 'อาจารย์',
                'phone'    => '055-234-567',
                'role'     => 'user',
            ],
        );

        $naree = User::updateOrCreate(
            ['email' => 'naree@uru.ac.th'],
            [
                'name'     => 'นารี สุขสงบ',
                'password' => Hash::make('password'),
                'faculty'  => 'มนุษยศาสตร์และสังคมศาสตร์',
                'major'    => 'ภาษาไทย',
                'position' => 'อาจารย์',
                'phone'    => '055-345-678',
                'role'     => 'user',
            ],
        );

        $mockUsers = [];

        foreach (range(1, 10) as $number) {
            $suffix = str_pad((string) $number, 2, '0', STR_PAD_LEFT);

            $mockUsers[] = User::updateOrCreate(
                ['email' => "mockuser{$suffix}@gmail.com"],
                [
                    'name'     => "Mock User {$suffix}",
                    'password' => Hash::make('password'),
                    'faculty'  => 'หน่วยงานทดสอบ',
                    'major'    => 'สาขาทดสอบ',
                    'position' => 'ผู้ใช้งานทดสอบ',
                    'phone'    => "080-000-00{$suffix}",
                    'role'     => 'user',
                ],
            );
        }

        $usersByName = [
            $admin->name => $admin,
            $somchai->name => $somchai,
            $naree->name => $naree,
        ];

        foreach ($mockUsers as $mockUser) {
            $usersByName[$mockUser->name] = $mockUser;
        }

        $researchers = [
            ['owner_user_id' => $admin->id, 'name' => $admin->name, 'faculty' => $admin->faculty, 'expertise' => 'วิทยาการคอมพิวเตอร์', 'email' => 'admin@uru.ac.th', 'phone' => $admin->phone],
            ['owner_user_id' => $somchai->id, 'name' => $somchai->name, 'faculty' => $somchai->faculty, 'expertise' => 'การศึกษาปฐมวัย', 'email' => $somchai->email, 'phone' => $somchai->phone],
            ['owner_user_id' => $naree->id, 'name' => $naree->name, 'faculty' => $naree->faculty, 'expertise' => 'ภาษาถิ่น', 'email' => $naree->email, 'phone' => $naree->phone],
        ];

        foreach ($mockUsers as $mockUser) {
            $researchers[] = [
                'name' => $mockUser->name,
                'owner_user_id' => $mockUser->id,
                'faculty' => $mockUser->faculty,
                'expertise' => 'ข้อมูลทดสอบระบบ',
                'email' => $mockUser->email,
                'phone' => $mockUser->phone,
            ];
        }

        foreach ($researchers as $researcher) {
            Researcher::updateOrCreate(
                ['email' => $researcher['email']],
                $researcher,
            );
        }

        foreach ([
            ['title' => 'AI เพื่อการเกษตรอัจฉริยะ', 'researcher' => $admin->name, 'budget' => '250000', 'year' => '2566', 'status' => 'กำลังดำเนินการ'],
            ['title' => 'การพัฒนาและอนุรักษ์ภาษาถิ่นเหนือ', 'researcher' => $naree->name, 'budget' => '150000', 'year' => '2566', 'status' => 'เสร็จสิ้น'],
            ['title' => 'นวัตกรรมการเรียนรู้ปฐมวัยผ่านเทคโนโลยี', 'researcher' => $somchai->name, 'budget' => '180000', 'year' => '2567', 'status' => 'อนุมัติแล้ว'],
        ] as $project) {
            Project::updateOrCreate(
                ['title' => $project['title']],
                [
                    ...$project,
                    'owner_user_id' => $usersByName[$project['researcher']]->id ?? $admin->id,
                ],
            );
        }

        foreach ([
            ['title' => 'Machine Learning Applications in Thai Agriculture', 'author' => $admin->name, 'journal' => 'Thai Journal of Science and Technology', 'year' => '2566', 'status' => 'ตีพิมพ์แล้ว', 'cited' => 12],
            ['title' => 'การอนุรักษ์ภาษาถิ่นด้วยเทคโนโลยีดิจิทัล', 'author' => $naree->name, 'journal' => 'วารสารมนุษยศาสตร์ มรอ.', 'year' => '2565', 'status' => 'ตีพิมพ์แล้ว', 'cited' => 5],
            ['title' => 'Active Learning in Early Childhood Education', 'author' => $somchai->name, 'journal' => 'Journal of Education Research', 'year' => '2566', 'status' => 'รอตีพิมพ์', 'cited' => 0],
        ] as $article) {
            Article::updateOrCreate(
                ['title' => $article['title']],
                [
                    ...$article,
                    'owner_user_id' => $usersByName[$article['author']]->id ?? $admin->id,
                ],
            );
        }

        foreach ([
            ['title' => 'วิจัยปัญญาประดิษฐ์เพื่อการเกษตรยั่งยืน', 'researcher' => $admin->name, 'type' => 'ทุนภายใน', 'budget' => '300000', 'year' => '2567', 'status' => 'submitted'],
            ['title' => 'การอนุรักษ์ภาษาถิ่นด้วย AI', 'researcher' => $naree->name, 'type' => 'ทุนภายนอก', 'budget' => '150000', 'year' => '2567', 'status' => 'approved', 'contract_no' => 'URU-2567-001', 'contract_date' => '2567-01-15'],
            ['title' => 'นวัตกรรมการสอนเด็กปฐมวัย', 'researcher' => $somchai->name, 'type' => 'ทุนภายใน', 'budget' => '200000', 'year' => '2567', 'status' => 'rejected'],
        ] as $proposal) {
            Proposal::updateOrCreate(
                ['title' => $proposal['title']],
                [
                    ...$proposal,
                    'owner_user_id' => $usersByName[$proposal['researcher']]->id ?? $admin->id,
                ],
            );
        }

        foreach ([
            ['project' => 'AI เพื่อการเกษตรอัจฉริยะ', 'title' => 'รายงานความก้าวหน้า ปีที่ 1', 'abstract' => 'พัฒนาโมเดล ML สำหรับวิเคราะห์คุณภาพดินและพยากรณ์ผลผลิต', 'date' => '2566-06-30', 'status' => 'submitted', 'researcher' => $admin->name],
            ['project' => 'การพัฒนาและอนุรักษ์ภาษาถิ่นเหนือ', 'title' => 'รายงานฉบับสมบูรณ์', 'abstract' => 'รวบรวมคำศัพท์ภาษาถิ่นเหนือและจัดทำฐานข้อมูลเสียง', 'date' => '2566-09-30', 'status' => 'approved', 'researcher' => $naree->name],
            ['project' => 'นวัตกรรมการเรียนรู้ปฐมวัยผ่านเทคโนโลยี', 'title' => 'รายงานร่างเพื่อขอรับข้อเสนอแนะ', 'abstract' => 'ทดสอบรูปแบบกิจกรรมการเรียนรู้ด้วยสื่อดิจิทัล', 'date' => '2567-03-15', 'status' => 'draft', 'researcher' => $somchai->name],
        ] as $report) {
            Report::updateOrCreate(
                ['title' => $report['title']],
                [
                    ...$report,
                    'owner_user_id' => $usersByName[$report['researcher']]->id ?? $admin->id,
                ],
            );
        }
    }
}
